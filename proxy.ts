import { stackMiddlewares } from '@/proxy/stackMiddlewares';
import { authMiddlware } from './proxy/auth-middleware/auth-middleware';
import { protectedRoutesMiddlware } from './proxy/protectedRoutes';

const middlewares = [authMiddlware, protectedRoutesMiddlware]; // Order matters!

export default stackMiddlewares(middlewares);
