import { Router, type IRouter } from "express";
import healthRouter from "./health";
import routesRouter from "./routes";
import complianceRouter from "./compliance";
import bankingRouter from "./banking";
import poolsRouter from "./pools";

const router: IRouter = Router();

router.use(healthRouter);
router.use(routesRouter);
router.use(complianceRouter);
router.use(bankingRouter);
router.use(poolsRouter);

export default router;
