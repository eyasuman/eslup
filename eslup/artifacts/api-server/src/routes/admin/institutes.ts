import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { createNotification } from "../../lib/notifications";

const router: IRouter = Router();
const INSTITUTE_STATUSES = ["Pending", "Active", "Declined"] as const;
type InstituteStatus = (typeof INSTITUTE_STATUSES)[number];

function validStatus(value: unknown): value is InstituteStatus {
  return typeof value === "string" && INSTITUTE_STATUSES.includes(value as InstituteStatus);
}

function readReason(value: unknown): string | undefined | null {
  if (value == null) return undefined;
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return reason.length <= 1000 ? reason : null;
}

// GET /api/admin/institutes?status=Pending&type=Clinic&search=...
router.get("/institutes", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "Pending";
  const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (status !== "all" && !validStatus(status)) {
    return res.status(400).json({ error: "status must be Pending, Active, Declined, or all" });
  }
  if (type.length > 100 || search.length > 100) {
    return res.status(400).json({ error: "Filter values must be 100 characters or fewer" });
  }
  let query = supabaseAdmin.from("institute_pulse").select("*").order("createdAt", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (search) {
    // PostgREST's OR syntax is safe here after stripping reserved separators.
    const term = search.replace(/[,%()]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

// GET /api/admin/institutes/:id/license-url
router.get("/institutes/:id/license-url", async (req, res) => {
  const { data: institute, error: instituteError } = await supabaseAdmin
    .from("institute_pulse")
    .select("licenseUploadId")
    .eq("id", req.params.id)
    .single();
  if (instituteError || !institute) return res.status(404).json({ error: "Institute not found" });
  if (!institute.licenseUploadId) {
    return res.status(404).json({ error: "No metadata-backed license upload exists for this institute" });
  }
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from("user_uploads")
    .select("bucket, storage_path, original_name, mime_type, status")
    .eq("id", institute.licenseUploadId)
    .single();
  if (uploadError || upload?.status !== "active") {
    return res.status(404).json({ error: "Institute license upload not found" });
  }
  const { data, error } = await supabaseAdmin.storage
    .from(upload.bucket)
    .createSignedUrl(upload.storage_path, 600);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ url: data.signedUrl, name: upload.original_name, type: upload.mime_type, expiresIn: 600 });
});

async function setInstituteStatus(id: string, status: InstituteStatus, reason?: string) {
  const { data, error } = await supabaseAdmin
    .from("institute_pulse")
    .update({ status, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error?.code === "PGRST116") return { data: null, error: null };
  if (error || !data) return { data: null, error };
  const approved = status === "Active";
  await createNotification({
    user_id: data.userId,
    title: approved ? "✅ Institute Application Approved" : "Institute Application Declined",
    body: approved
      ? `${data.name} is now active and visible to patients.`
      : reason
        ? `Your institute application was not approved: ${reason}`
        : "Your institute application was not approved. Please contact support for details.",
    type: "info",
  });
  return { data, error: null };
}

router.post("/institutes/:id/approve", async (req, res) => {
  const result = await setInstituteStatus(req.params.id, "Active");
  if (result.error) return res.status(500).json({ error: result.error.message });
  if (!result.data) return res.status(404).json({ error: "Institute not found" });
  return res.json(result.data);
});

router.post("/institutes/:id/decline", async (req, res) => {
  const reason = readReason(req.body?.reason);
  if (reason === null) return res.status(400).json({ error: "reason must be a string of 1000 characters or fewer" });
  const result = await setInstituteStatus(req.params.id, "Declined", reason);
  if (result.error) return res.status(500).json({ error: result.error.message });
  if (!result.data) return res.status(404).json({ error: "Institute not found" });
  return res.json(result.data);
});

export default router;