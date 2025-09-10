import { User } from '../modules/users/user.interface';
import { Request } from 'express';

export interface ProtectedRequest extends Request {
	user: User | null;
	admin: User | null;
}