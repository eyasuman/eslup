import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const router: IRouter = Router();

// GET /api/admin/uploads/:id/signed-url
// The parent admin router verifies a server-managed admin claim first.
router.get("/uploads/:id/signed-url", async (req, res) => {
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from("user_uploads")
    .select("bucket, storage_path, original_name, mime_type, size_bytes, category, status")
    .eq("id", req.params.id)
    .single();
  if (uploadError || upload?.status !== "active") {
    return res.status(404).json({ error: "Upload not found" });
  }
  const { data, error } = await supabaseAdmin.storage
    .from(upload.bucket)
    .createSignedUrl(upload.storage_path, 600);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    url: data.signedUrl,
    name: upload.original_name,
    type: upload.mime_type,
    sizeBytes: upload.size_bytes,
    category: upload.category,
    expiresIn: 600,
  });
});

export default router;