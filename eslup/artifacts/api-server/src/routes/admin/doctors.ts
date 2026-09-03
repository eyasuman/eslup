import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { createNotification } from "../../lib/notifications";

const router: IRouter = Router();

// GET /api/admin/doctors?status=Pending  (defaults to Pending)
router.get("/doctors", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "Pending";
  let query = supabaseAdmin.from("doctors").select("*").order("createdAt", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

// GET /api/admin/doctors/:id/license-url — metadata-backed private upload only.
router.get("/doctors/:id/license-url", async (req, res) => {
  const { id } = req.params;
  const { data: doctor, error: fetchError } = await supabaseAdmin
    .from("doctors")
    .select("licenseUploadId, licenseFile")
    .eq("id", id)
    .single();
  if (fetchError) return res.status(404).json({ error: fetchError.message });
  if (!doctor?.licenseUploadId) {
    return res.status(410).json({ error: "Legacy license records without user_uploads metadata cannot be accessed" });
  }
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from("user_uploads")
    .select("bucket, storage_path, original_name, mime_type, status")
    .eq("id", doctor.licenseUploadId)
    .single();
  if (uploadError || upload?.status !== "active") return res.status(404).json({ error: "License upload not found" });
  const { data, error } = await supabaseAdmin.storage
    .from(upload.bucket)
    .createSignedUrl(upload.storage_path, 60 * 10); // 10 minutes
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ url: data.signedUrl, name: upload.original_name, type: upload.mime_type, expiresIn: 600 });
});

// POST /api/admin/doctors/:id/approve
router.post("/doctors/:id/approve", async (req, res) => {
  const { id } = req.params;
  // NOTE: the mobile app's "approved & visible to patients" state is the string
  // "Active" (see lib/supabase.ts getApprovedDoctors / dashboard.tsx), not "Approved".
  const { data, error } = await supabaseAdmin
    .from("doctors")
    .update({ status: "Active", updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Doctor not found" });
  await createNotification({
    user_id: data.userId,
    title: "✅ Application Approved",
    body: `Congratulations ${data.name}! Your provider application has been approved. You can now accept appointments.`,
    type: "info",
  });
  return res.json(data);
});

// POST /api/admin/doctors/:id/decline  { reason?: string }
router.post("/doctors/:id/decline", async (req, res) => {
  const { id } = req.params;
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
  const { data, error } = await supabaseAdmin
    .from("doctors")
    .update({ status: "Declined", updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Doctor not found" });
  await createNotification({
    user_id: data.userId,
    title: "Application Declined",
    body: reason
      ? `Your provider application was not approved: ${reason}`
      : `Your provider application was not approved. Please contact support for details.`,
    type: "info",
  });
  return res.json(data);
});

export default router;
