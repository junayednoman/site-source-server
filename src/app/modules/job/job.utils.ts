import { JobTrade } from "@prisma/client";

const MILES_PER_KILOMETER = 0.621371;

export const getDistanceInMiles = (
  firstCoordinates?: number[],
  secondCoordinates?: number[]
) => {
  if (!firstCoordinates?.length || !secondCoordinates?.length) return null;

  const [firstLongitude, firstLatitude] = firstCoordinates;
  const [secondLongitude, secondLatitude] = secondCoordinates;

  if (
    firstLongitude === undefined ||
    firstLatitude === undefined ||
    secondLongitude === undefined ||
    secondLatitude === undefined
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusInKm = 6371;
  const latitudeDifference = toRadians(secondLatitude - firstLatitude);
  const longitudeDifference = toRadians(secondLongitude - firstLongitude);

  const haversineValue =
    Math.sin(latitudeDifference / 2) * Math.sin(latitudeDifference / 2) +
    Math.cos(toRadians(firstLatitude)) *
      Math.cos(toRadians(secondLatitude)) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const distanceInKm =
    earthRadiusInKm *
    2 *
    Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return Number((distanceInKm * MILES_PER_KILOMETER).toFixed(2));
};

export const getStringQuery = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const getNumberQuery = (value: unknown) => {
  const stringValue = getStringQuery(value);
  if (!stringValue) return undefined;

  const numberValue = Number(stringValue);
  return Number.isNaN(numberValue) ? undefined : numberValue;
};

export const getDateQuery = (value: unknown) => {
  const stringValue = getStringQuery(value);
  if (!stringValue) return undefined;

  const dateValue = new Date(stringValue);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
};

export const getTradeQuery = (value: unknown) => {
  const stringValue = getStringQuery(value);
  if (!stringValue) return undefined;

  return stringValue
    .split(",")
    .map(trade => trade.trim())
    .filter((trade): trade is JobTrade =>
      Object.values(JobTrade).includes(trade as JobTrade)
    );
};

export const EMPTY_OBJECT_ID = "000000000000000000000000";
const DAYS_IN_WEEK = 7;

export const getTimeSheetWeeks = (startDate: Date, endDate: Date) => {
  const weeks = [];
  const currentStartDate = new Date(startDate);
  let week = 1;

  while (currentStartDate <= endDate) {
    const currentEndDate = new Date(currentStartDate);
    currentEndDate.setDate(currentEndDate.getDate() + DAYS_IN_WEEK - 1);

    weeks.push({
      week,
      label: `week-${week}`,
      startDate: new Date(currentStartDate),
      endDate: currentEndDate > endDate ? new Date(endDate) : currentEndDate,
    });

    currentStartDate.setDate(currentStartDate.getDate() + DAYS_IN_WEEK);
    week += 1;
  }

  return weeks;
};
