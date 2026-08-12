import bcrypt from "bcrypt";
import config from "./app/config/index.js";
import prisma from "./app/utils/prisma.js";
import { LoginProvider, UserRole, UserStatus } from "@prisma/client";

const seedAdmin = async () => {
  try {
    const exist = await prisma.auth.findUnique({
      where: {
        email: config.admin.email,
      },
    });

    if (exist?.role === UserRole.ADMIN)
      return console.log("Admin already exists");

    const hashedPass = await bcrypt.hash(config.admin.password as string, 10);
    await prisma.$transaction(async tn => {
      const auth = await tn.auth.create({
        data: {
          email: config.admin.email as string,
          password: hashedPass,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          loginProvider: LoginProvider.EMAIL,
        },
      });

      await tn.profile.create({
        data: {
          authId: auth.id,
          name: "Admin",
          image: "",
        },
      });
    });
    console.log("Admin created");
  } catch (error) {
    console.log(error);
  }
};

seedAdmin();
