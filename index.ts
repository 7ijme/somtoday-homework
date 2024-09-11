import axios from "axios";
import somtoday from "somtoday.js";
import dotenv from "dotenv";
import { Convert } from "./convertdata";
import fs from "fs";
import ical from "ical-generator";

dotenv.config();
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SCHOOL: string;
      USERNAME: string;
      PASSWORD: string;
      ID: string;
      NTFY_URL: string;
      TOPIC: string;
    }
  }
}

const calendar = ical({ name: "Huiswerk" });

async function main() {
  const org = await somtoday.searchOrganisation({
    name: process.env.SCHOOL,
  });
  if (!org) throw new Error("School not found");
  const user = await org.authenticate({
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
  });
  const token = user.accessToken;

  const res = await axios.get(
    `https://api.somtoday.nl/rest/v1/studiewijzeritemafspraaktoekenningen`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );
  const data = Convert.toWelcome(JSON.stringify(res.data)).items;

  const formattedData = data.map((item) => ({
    onderwerp: item.studiewijzerItem.onderwerp,
    omschrijving: removeHtmlTags(item.studiewijzerItem.omschrijving),
    vak: item.lesgroep.vak.afkorting,
    id: item.studiewijzerItem.links[0].id,
    datum: new Date(item.datumTijd),
  })) satisfies Homework[];

  console.log(formattedData);

  for (const homework of formattedData) {
    addHomeworkToCalendar(homework);
  }

  fs.writeFileSync("calendar.ics", calendar.toString());
}

interface Homework {
  onderwerp: string;
  omschrijving: string;
  vak: string;
  id: number;
  datum: Date;
}

function removeHtmlTags(str: string) {
  return str.replace(/<[^>]*>/g, "");
}

function addHomeworkToCalendar(homework: Homework) {
  const title = !homework.omschrijving
    ? homework.vak
    : !homework.onderwerp
      ? homework.vak
      : `${homework.onderwerp} | ${homework.vak}`;
  const description = homework.omschrijving || homework.onderwerp;

  // day before at 17:00
  const dayBefore = new Date(homework.datum.getTime() - 86400000).setHours(17);

  calendar.createEvent({
    start: homework.datum,
    end: new Date(homework.datum.getTime() + 3600),
    summary: title,
    description,
    alarms: [{ trigger: dayBefore }],
  });
}

main();
