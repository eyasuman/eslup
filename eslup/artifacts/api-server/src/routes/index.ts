import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import bannersRouter from "./banners";
import videoRouter from "./video";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bannersRouter);           // public: GET /api/banners
router.use("/admin", adminRouter);
router.use("/video", videoRouter);

export default router;
