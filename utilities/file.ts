import { join } from "path";
export function basePath(path?: string) {
  return join(__dirname, "../../", path as string);
}
