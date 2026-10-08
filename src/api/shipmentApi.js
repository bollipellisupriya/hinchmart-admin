import dataStore from "./dataStore";

export const getShipments = async (filters = {}) => {
  return dataStore.getShipments(filters);
};

export const getShipmentById = async (id) => {
  return dataStore.getShipmentById(id);
};

export const updateShipmentStatus = async (id, status) => {
  return dataStore.updateShipmentStatus(id, status);
};
