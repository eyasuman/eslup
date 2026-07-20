import { Router, type IRouter } from "express";
import bannersRouter from "./banners";
import doctorsRouter from "./doctors";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(bannersRouter);
router.use(doctorsRouter);
router.use(paymentsRouter);

export default router;
