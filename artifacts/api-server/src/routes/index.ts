import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import bannersRouter from "./banners";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bannersRouter);           // public: GET /api/banners
router.use("/admin", adminRouter);

export default router;
