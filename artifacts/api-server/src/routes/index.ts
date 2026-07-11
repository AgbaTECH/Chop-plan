import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import vendorsRouter from "./vendors";
import userRouter from "./user";
import vendorDashRouter from "./vendor-dash";
import blogRouter from "./blog";
import contactRouter from "./contact";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(vendorsRouter);
router.use(userRouter);
router.use(vendorDashRouter);
router.use(blogRouter);
router.use(contactRouter);
router.use(adminRouter);

export default router;
