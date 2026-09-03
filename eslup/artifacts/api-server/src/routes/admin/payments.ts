import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { createNotification } from "../../lib/notifications";

const router: IRouter = Router();

// GET /api/admin/payments?status=pending (defaults to pending)
router.get("/payments", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  let query = supabaseAdmin.from("appointments").select("*").order("createdAt", { ascending: false });
  if (status !== "all") query = query.eq("paymentStatus", status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

router.get("/payments/:id/proof-url", async (req, res) => {
  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .select("paymentProofUploadId")
    .eq("id", req.params.id)
    .single();
  if (appointmentError || !appointment?.paymentProofUploadId) {
    return res.status(404).json({ error: "Payment proof not found" });
  }
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from("user_uploads")
    .select("bucket, storage_path, original_name, mime_type, status")
    .eq("id", appointment.paymentProofUploadId)
    .single();
  if (uploadError || upload?.status !== "active") return res.status(404).json({ error: "Payment proof not found" });
  const { data, error } = await supabaseAdmin.storage.from(upload.bucket).createSignedUrl(upload.storage_path, 600);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ url: data.signedUrl, name: upload.original_name, type: upload.mime_type, expiresIn: 600 });
});

// POST /api/admin/payments/:id/verify
router.post("/payments/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .update({ paymentStatus: "verified", updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Appointment not found" });

  const notifs: Promise<void>[] = [];
  if (data.patientId) {
    notifs.push(
      createNotification({
        user_id: data.patientId,
        title: "✅ Payment Verified",
        body: `Your payment for the appointment with ${data.doctorName} on ${data.date} has been verified. Your consultation is confirmed.`,
        type: "booking",
      })
    );
  }
  if (data.doctorUserId) {
    notifs.push(
      createNotification({
        user_id: data.doctorUserId,
        title: "🔔 New Appointment Request",
        body: `Payment from ${data.patientName} has been verified by admin. The appointment on ${data.date} is now in your requests — please accept or decline.`,
        type: "booking",
      })
    );
  }
  await Promise.all(notifs);
  return res.json(data);
});

// POST /api/admin/payments/:id/reject  { reason?: string }
router.post("/payments/:id/reject", async (req, res) => {
  const { id } = req.params;
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .update({ paymentStatus: "rejected", updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Appointment not found" });

  if (data.patientId) {
    await createNotification({
      user_id: data.patientId,
      title: "❌ Payment Rejected",
      body: reason
        ? `Your payment for the appointment on ${data.date} could not be verified: ${reason}. Please resubmit proof of payment.`
        : `Your payment for the appointment on ${data.date} could not be verified. Please resubmit proof of payment.`,
      type: "booking",
    });
  }
  return res.json(data);
});

export default router;
