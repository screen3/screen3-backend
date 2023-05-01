import express from "express";
import cors from "cors";
import { PORT } from "../constants/http";
import Event from "./event";
import Mongoose from "../database/mongoose";
import dotenv from "dotenv";
import AuthenticationController from "../controllers/authentication";
import MongoAuthDB from "../adapters/mongo/authDB";
import Encrypter from "./encrypter";
import JwtAuthenticator from "./jwtAuthenticator";
import PinRecord from "../adapters/pinRecord";
import Cache, { RedisCache } from "./cache";
import SendAuthenticationPin from "../events/handlers/sendAuthenticationPin";
import MailgunNotificationChannel from "../adapters/notification/channels/mailgun";
import { SendPin } from "../events/user";
import UserVideoController from "../controllers/user/video";
import { MongoVideo } from "../adapters/mongo/video";

dotenv.config();

export default class App {
  // @ts-ignore
  private cache: Cache;

  private readonly express = express();
  private readonly mongoose = new Mongoose();
  private readonly emitter = new Event();
  protected readonly mailChannel =
    MailgunNotificationChannel.initializeFromEnv();
  protected readonly mongoAuthDB = new MongoAuthDB();
  protected readonly authenticator = new JwtAuthenticator(this.mongoAuthDB);

  async startExpressWithRedisMongoDb() {
    await this.useRedisCache();

    this.express.use(cors());
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));

    await this.mongoose.start();

    this.registerEventListeners();
    this.registerControllersRoutes();

    this.express.listen(PORT, () => {
      console.log("app listening on:");
      console.log(`http://localhost:${PORT}`);
    });
  }

  private registerControllersRoutes(): App {
    this.express.use(this.makeAuthenticationController().registerRoutes());
    this.express.use(this.makeUserVideoController().registerRoutes());

    return this;
  }

  private registerEventListeners() {
    this.emitter.listen(
      SendPin.name,
      new SendAuthenticationPin(this.mailChannel)
    );
  }

  private async useRedisCache() {
    this.cache = await RedisCache.initFromEnv();
  }

  private makeAuthenticationController() {
    return new AuthenticationController(
      this.mongoAuthDB,
      new Encrypter(),
      this.authenticator,
      this.emitter,
      new PinRecord(this.cache)
    );
  }

  private makeUserVideoController() {
    return new UserVideoController(
      new MongoVideo(),
      this.emitter,
      this.authenticator
    );
  }
}
