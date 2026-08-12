import { UserRole } from "@prisma/client";
import { Request } from "express";
import { TFile } from "./file.interface.js";

export type TAuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type TRequest = Request & {
  user?: TAuthUser;
  file?: TFile;
  files?: TFile[] | Record<string, TFile[]>;
};
