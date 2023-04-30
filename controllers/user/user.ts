import { Request, RequestHandler, Response, Router } from "express";
import { UserDB, UserStoreParams } from "../../utilities/user";
import Validator from "../../app/validator";
import { StatusCodes } from "http-status-codes";
import Encrypter from "../../app/encrypter";
import { UserTypes } from "../../constants/user";
import { EventEmitter } from "../../app/event";
import { UserCreated } from "../../events/user";

export class UserController {
  private readonly router = Router();
  private readonly validator = new Validator();
  private readonly db: UserDB;
  private readonly encrypter: Encrypter;
  private readonly emitter: EventEmitter;
  constructor(db: UserDB, encrypter: Encrypter, emitter: EventEmitter) {
    this.db = db;
    this.encrypter = encrypter;
    this.emitter = emitter;
  }
  registerRoutes(): Router {
    this.router.post("user/register", this.store());
    return this.router;
  }

  private store(): RequestHandler {
    return async (
      req: Request<
        any,
        any,
        { firstname: string; lastname: string; email: string; password: string }
      >,
      res: Response
    ) => {
      const body = req.body;
      try {
        await this.validator.validate({}, body);
      } catch (e) {
        console.log(e);
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(e);
      }

      const input: UserStoreParams = {
        email: body.email,
        firstname: body.firstname,
        lastname: body.lastname,
        type: UserTypes.USER,
        password: await this.encrypter.hash(body.password),
      };

      try {
        const user = await this.db.store(input);
        const publicUser = { ...user, password: undefined };

        this.emitter.emit(new UserCreated(publicUser));

        return res.status(StatusCodes.CREATED).json(publicUser);
      } catch (e) {
        console.log(e);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    };
  }
}
