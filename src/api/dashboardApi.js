import dataStore from "./dataStore";

export const getDashboard = async () => {
  return dataStore.getDashboardStats();
};