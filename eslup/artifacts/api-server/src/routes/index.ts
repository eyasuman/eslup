import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import bannersRouter from "./banners";
import videoRouter from "./video";
import networkAdminRouter from "./admin/network";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bannersRouter);           // public: GET /api/banners
router.use("/admin", adminRouter);
router.use("/admin/network", networkAdminRouter);
router.use("/video", videoRouter);

export default router;
