import { basePath } from "../utilities/file";

export const THETA_ID = process.env.THETA_ID as string;
export const THETA_SECRET = process.env.THETA_SECRET as string;
export const DO_ACCESS_KEY_ID = process.env.DO_ACCESS_KEY_ID as string;
export const DO_ACCESS_KEY_SECRET = process.env.DO_ACCESS_KEY_SECRET as string;
export const DO_REGION = process.env.DO_REGION as string;

export const TEMP_VIDEO_DIR_PATH = basePath("resources/tmp/videos");
