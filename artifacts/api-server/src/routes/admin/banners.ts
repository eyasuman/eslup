import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/admin/banners
router.get("/banners", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("*")
    .order("priority", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

// POST /api/admin/banners
router.post("/banners", async (req, res) => {
  const body = req.body ?? {};
  if (!body.title || !body.message) {
    return res.status(400).json({ error: "title and message are required" });
  }
  const insert = {
    title: body.title,
    message: body.message,
    imageUrl: body.imageUrl ?? null,
    videoUrl: body.videoUrl ?? null,
    linkUrl: body.linkUrl ?? null,
    isActive: body.isActive ?? true,
    type: body.type ?? "photo",
    displayDuration: body.displayDuration ?? 5,
    priority: body.priority ?? 0,
    promoCode: body.promoCode ?? null,
  };
  const { data, error } = await supabaseAdmin.from("banners").insert(insert).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/admin/banners/:id
router.patch("/banners/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const allowed = [
    "title",
    "message",
    "imageUrl",
    "videoUrl",
    "linkUrl",
    "isActive",
    "type",
    "displayDuration",
    "priority",
    "promoCode",
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "no valid fields to update" });
  }
  const { data, error } = await supabaseAdmin.from("banners").update(update).eq("id", id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/admin/banners/:id
router.delete("/banners/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from("banners").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

// POST /api/admin/banners/upload-image (multipart form field "file")
router.post("/banners/upload-image", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "file is required" });
  const ext = file.originalname.split(".").pop() || "jpg";
  const path = `${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("banners")
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (uploadError) return res.status(500).json({ error: uploadError.message });
  const { data } = supabaseAdmin.storage.from("banners").getPublicUrl(path);
  return res.status(201).json({ path, imageUrl: data.publicUrl });
});

export default router;
