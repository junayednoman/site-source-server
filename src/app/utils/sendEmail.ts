import fs from "fs";
import axios from "axios";
import ApiError from "../classes/ApiError.js";
import config from "../config/index.js";

type Replacements = Record<string, string | number>;

export const sendEmail = async (
  to: string,
  subject: string,
  templatePath: string,
  replacements: Replacements
) => {
  const year = new Date().getFullYear().toString();

  fs.readFile(templatePath, "utf8", async (err, data) => {
    if (err) throw new ApiError(500, err.message || "Something went wrong");

    // Replace all placeholders
    let emailContent = data;
    for (const [key, value] of Object.entries(replacements)) {
      emailContent = emailContent.replace(`{{${key}}}`, value?.toString());
    }
    emailContent = emailContent.replace("{{year}}", year);

    const emailData = {
      to,
      subject,
      html: emailContent,
    };

    await axios.post(config.email.emailSendingApi as string, emailData);
  });
};
