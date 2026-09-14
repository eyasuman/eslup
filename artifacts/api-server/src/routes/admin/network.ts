import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();
const admin = supabaseAdmin as any;
const statuses = {
  provider: ["Active", "Pending", "Disabled", "Declined"],
  institute: ["Active", "Pending", "Suspended"],
  review: ["visible", "pinned", "banned", "shadow_banned"],
  payment: ["pending", "verified", "rejected"],
  case: ["pending", "in-review", "completed", "urgent"],
};

router.use(requireAdmin);

function id(req: Request): string | null {
  const value = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return typeof value === "string" && value.length > 0 ? value : null;
}
function invalid(res: Response, message: string): void { res.status(400).json({ error: message }); }
function failure(req: Request, res: Response, err: unknown): void {
  req.log.error({ err }, "Pulse network admin request failed");
  res.status(500).json({ error: "Unable to complete the request" });
}
async function audit(req: Request, action: string, objectType: string): Promise<void> {
  const actorId = resActor(req);
  const { error } = await admin.from("auditLogs").insert({
    actorId,
    actorName: "Administrator",
    action,
    objectType,
    type: "Admin",
    timestamp: new Date().toISOString(),
  });
  if (error) throw error;
}
function resActor(req: Request): string { return req.res?.locals?.adminUserId ?? "Admin"; }
const num = (value: unknown) => typeof value === "number" ? value : Number.parseFloat(String(value ?? 0)) || 0;
function parseJson(value: unknown): any { try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return null; } }
function doctor(row: any) {
  return { id: row.id, name: row.name ?? "", specialty: row.specialty ?? "", category: row.providerType?.toLowerCase() ?? "doctor",
    status: row.status ?? "Pending", email: row.email ?? "", phone: row.phone ?? "", city: row.city ?? "", consultationFee: num(row.consultationFee),
    experienceYears: row.experienceYears ?? 0, licenseNo: row.licenseNo ?? "", bio: row.bio ?? "",
    serviceModes: parseJson(row.serviceModes) ?? { video: false, audio: false, inPerson: true, homeVisit: false },
    licenseFile: parseJson(row.licenseFile) ?? (row.licenseUploadId ? { path: row.licenseUploadId, name: "Private license" } : null),
    avatarUrl: row.avatarUrl ?? null, createdAt: row.createdAt ?? new Date().toISOString() };
}
function appointment(row: any) {
  return { id: row.id, doctorName: row.doctorName ?? "", patientName: row.patientName ?? "", specialty: row.specialty ?? "", status: row.status ?? "pending",
    consultationFee: num(row.consultationFee), platformFee: num(row.platformFee), totalPrice: num(row.totalPrice), date: row.date ?? new Date().toISOString(),
    serviceType: row.serviceType ?? "", paymentStatus: row.paymentStatus ?? "verified",
    paymentProofUrl: row.paymentProofUrl ?? (row.paymentProofUploadId ? "private" : null),
    paymentProofUploadId: row.paymentProofUploadId ?? null,
    paymentMethod: row.paymentMethod ?? null, transactionId: row.transactionId ?? null, senderName: row.senderName ?? null, createdAt: row.createdAt ?? new Date().toISOString() };
}
function institute(row: any) {
  const license = row.licenseNo ?? row.license_no ?? ""; const certificate = license.startsWith("http");
  return { id: row.id, name: row.name ?? "", type: row.type ?? "", status: row.status ?? "Pending", city: row.city ?? "", address: row.address ?? "",
    phone: row.phone ?? "", email: row.email ?? "", licenseNo: certificate ? "Certificate on file" : license, certificateUrl: certificate ? license : undefined,
    totalDoctors: row.totalDoctors ?? row.total_doctors ?? 0, totalBeds: row.totalBeds ?? row.total_beds ?? null, services: row.services ?? [],
    accreditations: row.accreditations ?? null, createdAt: row.createdAt ?? new Date().toISOString() };
}

router.get("/providers", async (req, res): Promise<void> => { try { const { data, error } = await admin.from("doctors").select("*").order("createdAt"); if (error) throw error; res.json((data ?? []).map(doctor)); } catch (e) { failure(req,res,e); } });
router.patch("/providers/:id/status", async (req,res): Promise<void> => { const value=id(req); const status=req.body?.status; if(!value || !statuses.provider.includes(status)) return invalid(res,"Invalid provider status"); try { const {data,error}=await admin.from("doctors").update({status}).eq("id",value).select().single(); if(error) throw error; if(!data){res.status(404).json({error:"Not found"});return;} await audit(req,`updated provider "${data.name}" status to ${status}`,"provider");res.json(doctor(data)); }catch(e){failure(req,res,e);} });
router.get("/providers/:id/license-url", async (req,res): Promise<void> => {
  const value=id(req); if(!value)return invalid(res,"Invalid provider id");
  try {
    const {data:provider,error}=await admin.from("doctors").select("licenseUploadId,licenseFile").eq("id",value).single();
    if(error||!provider){res.status(404).json({error:"Not found"});return;}
    if(provider.licenseUploadId){
      const {data:upload,error:uploadError}=await admin.from("user_uploads").select("bucket,storage_path,original_name,status").eq("id",provider.licenseUploadId).single();
      if(uploadError||upload?.status!=="active"){res.status(404).json({error:"License upload not found"});return;}
      const {data:signed,error:signError}=await admin.storage.from(upload.bucket).createSignedUrl(upload.storage_path,300);
      if(signError)throw signError;
      res.json({url:signed.signedUrl,name:upload.original_name??null,expiresIn:300});return;
    }
    const file=parseJson(provider.licenseFile);
    if(!file?.path){res.status(404).json({error:"No license file on record"});return;}
    const {data:signed,error:signError}=await admin.storage.from("medical-licenses").createSignedUrl(file.path,300);
    if(signError)throw signError;
    res.json({url:signed.signedUrl,name:file.name??null,expiresIn:300});
  }catch(e){failure(req,res,e);}
});
router.delete("/providers/:id", async(req,res): Promise<void>=>{const value=id(req);if(!value)return invalid(res,"Invalid provider id");try{const {data,error}=await admin.from("doctors").delete().eq("id",value).select().single();if(error)throw error;if(!data){res.status(404).json({error:"Not found"});return;}await audit(req,`deleted provider "${data.name}"`,"provider");res.sendStatus(204);}catch(e){failure(req,res,e);}});

router.get("/appointments", async(req,res): Promise<void>=>{try{const {data,error}=await admin.from("appointments").select("*").order("date",{ascending:false});if(error)throw error;res.json((data??[]).map(appointment));}catch(e){failure(req,res,e);}});
router.get("/appointments/:id/payment-proof-url",async(req,res):Promise<void>=>{
  const value=id(req);if(!value)return invalid(res,"Invalid appointment id");
  try{
    const {data:appointmentRow,error}=await admin.from("appointments").select("paymentProofUploadId,paymentProofUrl").eq("id",value).single();
    if(error||!appointmentRow){res.status(404).json({error:"Not found"});return;}
    if(appointmentRow.paymentProofUploadId){
      const {data:upload,error:uploadError}=await admin.from("user_uploads").select("bucket,storage_path,original_name,status").eq("id",appointmentRow.paymentProofUploadId).single();
      if(uploadError||upload?.status!=="active"){res.status(404).json({error:"Payment proof upload not found"});return;}
      const {data:signed,error:signError}=await admin.storage.from(upload.bucket).createSignedUrl(upload.storage_path,300);
      if(signError)throw signError;
      res.json({url:signed.signedUrl,name:upload.original_name??null,expiresIn:300});return;
    }
    if(!appointmentRow.paymentProofUrl){res.status(404).json({error:"No payment proof on record"});return;}
    res.json({url:appointmentRow.paymentProofUrl,name:null,expiresIn:null});
  }catch(e){failure(req,res,e);}
});
router.patch("/appointments/:id/payment-status", async(req,res): Promise<void>=>{const value=id(req), paymentStatus=req.body?.paymentStatus;if(!value||!statuses.payment.includes(paymentStatus))return invalid(res,"Invalid paymentStatus");try{const {data,error}=await admin.from("appointments").update({paymentStatus}).eq("id",value).select().single();if(error)throw error;if(!data){res.status(404).json({error:"Not found"});return;}await audit(req,`set payment status to "${paymentStatus}"`,"appointment");res.json(appointment(data));}catch(e){failure(req,res,e);}});
router.get("/revenue", async(req,res): Promise<void>=>{try{const {data,error}=await admin.from("appointments").select("id,platformFee,paymentStatus,createdAt").order("createdAt");if(error)throw error;const groups=new Map<string,any>();for(const row of data??[]){const d=new Date(row.createdAt);if(Number.isNaN(d.valueOf()))continue;const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, g=groups.get(key)??{id:`rev_${key}`,month:d.toLocaleString("default",{month:"short"}),year:d.getFullYear(),revenue:0,appointments:0,verifiedPayments:0};g.revenue+=num(row.platformFee);g.appointments++;if(row.paymentStatus==="verified")g.verifiedPayments++;groups.set(key,g);}res.json([...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,g])=>({...g,revenue:Math.round(g.revenue*100)/100})));}catch(e){failure(req,res,e);}});

router.get("/institutes",async(req,res):Promise<void>=>{try{const {data,error}=await admin.from("institute_pulse").select("*").order("createdAt",{ascending:false});if(error)throw error;res.json((data??[]).map(institute));}catch(e){failure(req,res,e);}});
router.post("/institutes",async(req,res):Promise<void>=>{if(!req.body?.name||!req.body?.type)return invalid(res,"name and type are required");try{const {data,error}=await admin.from("institute_pulse").insert({...req.body,services:req.body.services??[]}).select().single();if(error)throw error;await audit(req,`created institute "${data.name}"`,"institute");res.status(201).json(institute(data));}catch(e){failure(req,res,e);}});
router.patch("/institutes/:id/status",async(req,res):Promise<void>=>{const value=id(req),status=req.body?.status;if(!value||!statuses.institute.includes(status))return invalid(res,"Invalid institute status");try{const {data,error}=await admin.from("institute_pulse").update({status}).eq("id",value).select().single();if(error)throw error;if(!data){res.status(404).json({error:"Not found"});return;}res.json(institute(data));}catch(e){failure(req,res,e);}});
router.delete("/institutes/:id",async(req,res):Promise<void>=>{const value=id(req);if(!value)return invalid(res,"Invalid institute id");try{const {error}=await admin.from("institute_pulse").delete().eq("id",value);if(error)throw error;res.sendStatus(204);}catch(e){failure(req,res,e);}});

router.get("/banners",async(req,res):Promise<void>=>{try{const {data,error}=await admin.from("banners").select("*").order("priority",{ascending:false});if(error)throw error;res.json(data??[]);}catch(e){failure(req,res,e);}});
router.post("/banners",async(req,res):Promise<void>=>{if(!req.body?.title||!req.body?.message)return invalid(res,"title and message are required");try{const {data,error}=await admin.from("banners").insert(req.body).select().single();if(error)throw error;res.status(201).json(data);}catch(e){failure(req,res,e);}});
router.patch("/banners/:id/toggle",async(req,res):Promise<void>=>{const value=id(req);if(!value)return invalid(res,"Invalid banner id");try{const {data:old,error}=await admin.from("banners").select("isActive").eq("id",value).single();if(error||!old){res.status(404).json({error:"Not found"});return;}const {data,error:updateError}=await admin.from("banners").update({isActive:!old.isActive}).eq("id",value).select().single();if(updateError)throw updateError;res.json(data);}catch(e){failure(req,res,e);}});
router.delete("/banners/:id",async(req,res):Promise<void>=>{const value=id(req);if(!value)return invalid(res,"Invalid banner id");try{const {error}=await admin.from("banners").delete().eq("id",value);if(error)throw error;res.sendStatus(204);}catch(e){failure(req,res,e);}});
router.post("/banners/upload-image",async(req,res):Promise<void>=>{const image=req.body?.imageBase64, contentType=req.body?.contentType;if(typeof image!=="string"||!["image/png","image/jpeg","image/jpg","image/webp","image/gif"].includes(contentType))return invalid(res,"A supported image is required");const bytes=Buffer.from(image.replace(/^data:[^;]+;base64,/,""),"base64");if(!bytes.length||bytes.length>5*1024*1024)return invalid(res,"Image must be no larger than 5MB");try{const ext=contentType.split("/")[1];const path=`admin/${randomUUID()}.${ext}`;const {error}=await admin.storage.from("banners").upload(path,bytes,{contentType,upsert:false});if(error)throw error;const {data}=admin.storage.from("banners").getPublicUrl(path);res.status(201).json({url:data.publicUrl});}catch(e){failure(req,res,e);}});

router.get("/reviews",async(req,res):Promise<void>=>{try{const {data,error}=await admin.from("reviews").select("*").order("createdAt",{ascending:false});if(error)throw error;res.json(data??[]);}catch(e){failure(req,res,e);}});
router.patch("/reviews/:id/status",async(req,res):Promise<void>=>{const value=id(req),status=req.body?.status;if(!value||!statuses.review.includes(status))return invalid(res,"Invalid review status");try{const {data,error}=await admin.from("reviews").update({status}).eq("id",value).select().single();if(error)throw error;if(!data){res.status(404).json({error:"Not found"});return;}res.json(data);}catch(e){failure(req,res,e);}});
router.get("/patients",async(req,res):Promise<void>=>{try{
  const {data,error}=await admin.from("appointments").select("patientId,patientName,patientEmail,createdAt").order("createdAt");
  if(error)throw error;
  const patients=new Map<string,any>();
  for(const r of data??[]){const key=r.patientId??r.patientEmail;if(!key)continue;const p=patients.get(key)??{id:key,name:r.patientName??"",email:r.patientEmail??"",status:"active",totalAppointments:0,createdAt:r.createdAt};p.totalAppointments++;patients.set(key,p);}
  await Promise.all([...patients.values()].map(async(p:any)=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id))return;
    const {data:userData}=await admin.auth.admin.getUserById(p.id);
    if(userData?.user){
      p.name=p.name||userData.user.user_metadata?.name||"";
      p.email=p.email||userData.user.email||"";
      p.status=userData.user.app_metadata?.suspended===true?"suspended":"active";
    }
  }));
  res.json([...patients.values()]);
}catch(e){failure(req,res,e);}});
router.patch("/patients/:id/toggle",async(req,res):Promise<void>=>{
  const value=id(req);if(!value)return invalid(res,"Invalid patient id");
  try{
    const {data:current,error}=await admin.auth.admin.getUserById(value);
    if(error||!current?.user){res.status(404).json({error:"Patient account not found"});return;}
    const suspended=current.user.app_metadata?.suspended===true;
    const {data:updated,error:updateError}=await admin.auth.admin.updateUserById(value,{app_metadata:{...current.user.app_metadata,suspended:!suspended}});
    if(updateError||!updated?.user)throw updateError??new Error("Patient update failed");
    const {data:appointmentRows,error:appointmentError}=await admin.from("appointments").select("patientName,patientEmail,createdAt").eq("patientId",value).order("createdAt").limit(1);
    if(appointmentError)throw appointmentError;
    const row=appointmentRows?.[0];
    const patient={id:value,name:row?.patientName??updated.user.user_metadata?.name??"",email:row?.patientEmail??updated.user.email??"",status:!suspended?"suspended":"active",totalAppointments:0,createdAt:row?.createdAt??updated.user.created_at};
    const {count}=await admin.from("appointments").select("id",{count:"exact",head:true}).eq("patientId",value);
    patient.totalAppointments=count??0;
    await audit(req,`${!suspended?"suspended":"reactivated"} patient account`,"patient");
    res.json(patient);
  }catch(e){failure(req,res,e);}
});

router.get("/audit",async(req,res):Promise<void>=>{try{const {data,error}=await admin.from("auditLogs").select("*").order("timestamp",{ascending:false});if(error)throw error;res.json((data??[]).map((r:any)=>({id:r.id,actorName:r.actorName??r.actor_name??"System",action:r.action??"",objectType:r.objectType??r.object_type??"",type:r.type??"System",timestamp:r.timestamp??r.createdAt})));}catch(e){failure(req,res,e);}});
router.get("/teleradiology",async(req,res):Promise<void>=>{try{const {data,error}=await admin.from("teleradiologyCases").select("*").order("createdAt",{ascending:false});if(error)throw error;res.json((data??[]).map((r:any)=>({...r,caseId:r.caseId??r.id,hasScanFile:!!parseJson(r.scanFile)})));}catch(e){failure(req,res,e);}});
router.patch("/teleradiology/:id/status",async(req,res):Promise<void>=>{const value=id(req),status=req.body?.status;if(!value||!statuses.case.includes(status))return invalid(res,"Invalid case status");try{const {data,error}=await admin.from("teleradiologyCases").update({status}).eq("id",value).select().single();if(error)throw error;if(!data){res.status(404).json({error:"Not found"});return;}res.json({...data,caseId:data.caseId??data.id,hasScanFile:!!parseJson(data.scanFile)});}catch(e){failure(req,res,e);}});
router.get("/teleradiology/:id/scan-url",async(req,res):Promise<void>=>{const value=id(req);if(!value)return invalid(res,"Invalid case id");try{const {data,error}=await admin.from("teleradiologyCases").select("scanFile").eq("id",value).single();const file=parseJson(data?.scanFile);if(error||!file?.path){res.status(404).json({error:"No scan file on record"});return;}const {data:signed,error:signError}=await admin.storage.from("radiology-scans").createSignedUrl(file.path,300);if(signError)throw signError;res.json({url:signed.signedUrl,name:file.name??null,expiresIn:300});}catch(e){failure(req,res,e);}});

function platformSettings(row:any){
  return {platformFee:num(row?.fixedPlatformFee??10),cancellationNoticePeriodHours:num(row?.noticePeriodHours??24),
    cancellationPenaltyFee:num(row?.penaltyFee??50),reminderCadence:row?.reminderCadence??"daily"};
}
router.get("/settings",async(req,res):Promise<void>=>{try{
  let {data,error}=await admin.from("settings").select("*").eq("id","singleton").maybeSingle();
  if(error)throw error;
  if(!data){const fallback=await admin.from("settings").select("*").order("id").limit(1).maybeSingle();if(fallback.error)throw fallback.error;data=fallback.data;}
  res.json(platformSettings(data));
}catch(e){failure(req,res,e);}});
router.put("/settings",async(req,res):Promise<void>=>{if(typeof req.body?.platformFee!=="number")return invalid(res,"platformFee is required");try{
  const update={fixedPlatformFee:req.body.platformFee,noticePeriodHours:req.body.cancellationNoticePeriodHours,
    penaltyFee:req.body.cancellationPenaltyFee,reminderCadence:req.body.reminderCadence,updatedAt:new Date().toISOString(),updatedBy:req.res?.locals?.adminUserId??"admin"};
  const {data,error}=await admin.from("settings").upsert({id:"singleton",...update}).select().single();
  if(error)throw error;
  await audit(req,"updated platform settings","settings");
  res.json(platformSettings(data));
}catch(e){failure(req,res,e);}});
router.patch("/settings/gateway-password",async(req,res):Promise<void>=>{if(typeof req.body?.password!=="string"||req.body.password.length<4)return invalid(res,"password must be at least 4 characters");try{const {data,error}=await admin.from("settings").select("id").order("id").limit(1).maybeSingle();if(error)throw error;if(!data){res.status(404).json({error:"Settings not found"});return;}const {error:updateError}=await admin.from("settings").update({gatewayPassword:req.body.password}).eq("id",data.id);if(updateError)throw updateError;res.json({success:true});}catch(e){failure(req,res,e);}});

router.get("/notifications",async(req,res):Promise<void>=>{try{const {data,error}=await admin.from("notifications").select("*").order("created_at",{ascending:false}).limit(100);if(error)throw error;res.json((data??[]).map((r:any)=>({...r,createdAt:r.created_at??r.createdAt,data:parseJson(r.data)??null})));}catch(e){failure(req,res,e);}});
router.patch("/notifications/:id/read",async(req,res):Promise<void>=>{const value=id(req);if(!value)return invalid(res,"Invalid notification id");try{const {data,error}=await admin.from("notifications").update({read:true}).eq("id",value).select().single();if(error)throw error;res.json({...data,createdAt:data.created_at??data.createdAt,data:parseJson(data.data)??null});}catch(e){failure(req,res,e);}});
router.patch("/notifications/read-all",async(req,res):Promise<void>=>{try{const {data,error}=await admin.from("notifications").update({read:true}).eq("read",false).select("id");if(error)throw error;res.json({updated:data?.length??0});}catch(e){failure(req,res,e);}});
router.post("/notifications/in-app",async(req,res):Promise<void>=>{const {title,body,type,data}=req.body??{};if(typeof title!=="string"||typeof body!=="string"||!["payment_proof","license_review","appointment_request","urgent_case","info"].includes(type))return invalid(res,"title, body, and a valid type are required");try{const now=new Date().toISOString();const {data:created,error}=await admin.from("notifications").insert({title,body,type,read:false,data:data?JSON.stringify(data):null,status:"sent",created_at:now,sent_at:now}).select().single();if(error)throw error;res.status(201).json({...created,createdAt:created.created_at,data:parseJson(created.data)??null});}catch(e){failure(req,res,e);}});

export default router;