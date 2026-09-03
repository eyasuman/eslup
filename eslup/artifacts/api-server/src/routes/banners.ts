import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

const router: IRouter = Router();

// GET /api/banners — public, no auth required
// Returns only banners the admin has marked isActive=true, ordered by priority.
router.get("/banners", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("banners")
      .select("id, title, message, promoCode, imageUrl, videoUrl, linkUrl, type, displayDuration, priority")
      .eq("isActive", true)
      .order("priority", { ascending: false });

    if (error) return res.json([]);

    const banners = (data ?? []).map((b) => ({
      id: b.id,
      title: b.title ?? "",
      message: b.message ?? "",
      promoCode: b.promoCode ?? "",
      imageUrl: b.imageUrl ?? null,
      videoUrl: b.videoUrl ?? null,
      linkUrl: b.linkUrl ?? null,
      type: b.type ?? "photo",
      displayDuration: b.displayDuration ?? 5,
    }));

    return res.json(banners);
  } catch {
    return res.json([]);
  }
});

export default router;
