import { Router, type IRouter } from "express";
import bannersRouter from "./banners";
import doctorsRouter from "./doctors";
import paymentsRouter from "./payments";
import uploadsRouter from "./uploads";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

router.use(requireAdmin);
router.use(bannersRouter);
router.use(doctorsRouter);
router.use(paymentsRouter);
router.use(uploadsRouter);

export default router;
