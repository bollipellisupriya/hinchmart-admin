import api from "./axios";
import { invalidateRequest } from "./requestCache";
import { dispatchDataUpdate } from "./dataStore";

const STORAGE_KEY_SPECIFICATIONS = "hinchmart_specifications_data_v1";
const STORAGE_KEY_CATEGORY_SPECS = "hinchmart_category_specs_mapping_v1";

const isRemoteId = (id) => {
  if (!id) return false;
  const num = Number(id);
  return !isNaN(num) && num > 0 && num <= 2147483647;
};

export const INITIAL_SPECIFICATIONS = [
  {
    id: 1,
    name: "Grade",
    key: "grade",
    inputType: "DROPDOWN",
    unit: null,
    active: true,
    options: [
      { id: 101, value: "Fe 415", displayOrder: 1 },
      { id: 102, value: "Fe 500", displayOrder: 2 },
      { id: 103, value: "Fe 550", displayOrder: 3 },
      { id: 104, value: "Fe 550D", displayOrder: 4 },
      { id: 105, value: "Fe 600", displayOrder: 5 },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
  },
  {
    id: 2,
    name: "Diameter",
    key: "diameter",
    inputType: "NUMBER",
    unit: "mm",
    active: true,
    options: [],
    createdAt: "2026-09-22T10:00:00.000Z",
  },
  {
    id: 3,
    name: "Yield Strength",
    key: "yield_strength",
    inputType: "NUMBER",
    unit: "N/mm²",
    active: true,
    options: [],
    createdAt: "2026-09-22T10:00:00.000Z",
  },
  {
    id: 4,
    name: "Material / Standard",
    key: "material_standard",
    inputType: "DROPDOWN",
    unit: null,
    active: true,
    options: [
      { id: 106, value: "IS 1786:2008", displayOrder: 1 },
      { id: 107, value: "IS 2062:2011", displayOrder: 2 },
      { id: 108, value: "ASTM A615", displayOrder: 3 },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
  },
  {
    id: 5,
    name: "Coating / Finish",
    key: "coating_finish",
    inputType: "DROPDOWN",
    unit: null,
    active: true,
    options: [
      { id: 109, value: "Epoxy Coated", displayOrder: 1 },
      { id: 110, value: "Galvanized", displayOrder: 2 },
      { id: 111, value: "Self-Colored (Black)", displayOrder: 3 },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
  },
  {
    id: 6,
    name: "Length",
    key: "length",
    inputType: "NUMBER",
    unit: "meters",
    active: true,
    options: [],
    createdAt: "2026-09-22T10:00:00.000Z",
  },
  {
    id: 7,
    name: "ISI Certified",
    key: "isi_certified",
    inputType: "BOOLEAN",
    unit: null,
    active: true,
    options: [],
    createdAt: "2026-09-22T10:00:00.000Z",
  },
];

// Initial category specification mappings: Category 1 (Civil & Structural) -> Grade, Diameter, Yield Strength, Material/Standard
export const INITIAL_CATEGORY_SPEC_MAPPINGS = {
  1: [
    {
      id: 1,
      mappingId: 50,
      categoryId: 1,
      name: "Grade",
      key: "grade",
      inputType: "DROPDOWN",
      unit: null,
      required: true,
      displayOrder: 1,
      active: true,
      options: ["Fe 415", "Fe 500", "Fe 550", "Fe 550D", "Fe 600"],
    },
    {
      id: 2,
      mappingId: 51,
      categoryId: 1,
      name: "Diameter",
      key: "diameter",
      inputType: "NUMBER",
      unit: "mm",
      required: true,
      displayOrder: 2,
      active: true,
      options: [],
    },
    {
      id: 3,
      mappingId: 52,
      categoryId: 1,
      name: "Yield Strength",
      key: "yield_strength",
      inputType: "NUMBER",
      unit: "N/mm²",
      required: false,
      displayOrder: 3,
      active: true,
      options: [],
    },
    {
      id: 4,
      mappingId: 53,
      categoryId: 1,
      name: "Material / Standard",
      key: "material_standard",
      inputType: "DROPDOWN",
      unit: null,
      required: false,
      displayOrder: 4,
      active: true,
      options: ["IS 1786:2008", "IS 2062:2011", "ASTM A615"],
    },
  ],
};

let inMemorySpecifications = null;
let inMemoryCategorySpecs = null;

export const getStoredSpecifications = () => {
  if (inMemorySpecifications !== null && Array.isArray(inMemorySpecifications)) {
    return inMemorySpecifications;
  }
  if (typeof window === "undefined") return INITIAL_SPECIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPECIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemorySpecifications = parsed;
        return inMemorySpecifications;
      }
    }
  } catch {}
  inMemorySpecifications = [...INITIAL_SPECIFICATIONS];
  setStoredSpecifications(inMemorySpecifications);
  return inMemorySpecifications;
};

export const setStoredSpecifications = (specs) => {
  inMemorySpecifications = Array.isArray(specs) ? specs : [];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_SPECIFICATIONS, JSON.stringify(inMemorySpecifications));
    } catch {}
  }
};

export const getStoredCategorySpecs = () => {
  if (inMemoryCategorySpecs !== null && typeof inMemoryCategorySpecs === "object") {
    return inMemoryCategorySpecs;
  }
  if (typeof window === "undefined") return INITIAL_CATEGORY_SPEC_MAPPINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORY_SPECS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        inMemoryCategorySpecs = parsed;
        return inMemoryCategorySpecs;
      }
    }
  } catch {}
  inMemoryCategorySpecs = { ...INITIAL_CATEGORY_SPEC_MAPPINGS };
  setStoredCategorySpecs(inMemoryCategorySpecs);
  return inMemoryCategorySpecs;
};

export const setStoredCategorySpecs = (mappings) => {
  inMemoryCategorySpecs = mappings && typeof mappings === "object" ? mappings : {};
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORY_SPECS, JSON.stringify(inMemoryCategorySpecs));
    } catch {}
  }
};

/* ==========================================================================
   1. SPECIFICATION MASTER APIs (/api/specifications)
   ========================================================================== */

/**
 * 1.1 Create Specification Master (POST /api/specifications)
 * Payload: { name, key, inputType, unit, active, options: ["Fe 415", "Fe 500"] }
 */
export const createSpecification = async (payload) => {
  const cleanKey = payload.key?.trim() || (payload.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
  
  // Format options: support array of strings, { value }, or { optionValue, displayOrder }
  const initialOptions = Array.isArray(payload.options)
    ? payload.options.map((opt, idx) => {
        if (typeof opt === "string") {
          return { id: 1000 + idx + 1, value: opt, optionValue: opt, displayOrder: idx + 1 };
        }
        const optVal = opt.optionValue || opt.value || "";
        return {
          id: opt.id || 1000 + idx + 1,
          value: optVal,
          optionValue: optVal,
          displayOrder: Number(opt.displayOrder || idx + 1),
        };
      })
    : [];

  const body = {
    name: payload.name?.trim(),
    key: cleanKey,
    inputType: payload.inputType || "TEXT",
    unit: payload.unit || null,
    active: payload.active !== undefined ? Boolean(payload.active) : true,
    options: initialOptions.map((o) => ({ optionValue: o.optionValue, displayOrder: o.displayOrder })),
  };

  let created = null;
  try {
    const res = await api.post("/specifications", body);
    created = res.data?.data || res.data;
  } catch (err) {
    console.warn("POST /specifications error/fallback:", err?.response?.data || err?.message);
  }

  if (!created || !created.id) {
    const newId = Date.now();
    created = {
      id: newId,
      name: body.name,
      key: body.key,
      inputType: body.inputType,
      unit: body.unit,
      active: body.active,
      options: initialOptions,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
  } else if (!Array.isArray(created.options) || created.options.length === 0) {
    created.options = initialOptions;
  }

  const existing = getStoredSpecifications();
  const updated = [created, ...existing.filter((s) => String(s.id) !== String(created.id))];
  setStoredSpecifications(updated);

  dispatchDataUpdate("specifications", "CREATE", created);
  invalidateRequest("specifications");

  return created;
};

/**
 * 1.2 Get All Specifications (GET /api/specifications)
 * Query Params: active=true, search=grade
 */
export const getSpecifications = async (params = {}) => {
  try {
    const res = await api.get("/specifications", { params });
    const data = res.data?.data || res.data;
    if (Array.isArray(data) && data.length > 0) {
      setStoredSpecifications(data);
      return data;
    }
  } catch (err) {
    console.warn("GET /specifications notice:", err?.response?.data?.message || err?.message);
  }

  let list = getStoredSpecifications();
  if (params.active === true || params.active === "true") {
    list = list.filter((s) => s.active !== false);
  }
  if (params.search) {
    const q = String(params.search).toLowerCase();
    list = list.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.key || "").toLowerCase().includes(q));
  }
  return list;
};

/**
 * 1.3 Get Specification by ID (GET /api/specifications/{id})
 */
export const getSpecificationById = async (id) => {
  try {
    const res = await api.get(`/specifications/${id}`);
    const data = res.data?.data || res.data;
    if (data) return data;
  } catch (err) {
    console.warn(`GET /specifications/${id} notice:`, err?.response?.data?.message || err?.message);
  }

  const all = getStoredSpecifications();
  return all.find((s) => String(s.id) === String(id)) || null;
};

/**
 * 1.4 Update Specification Master (PUT /api/specifications/{id})
 * Payload: { name, key, inputType, unit, active }
 */
export const updateSpecification = async (id, payload) => {
  const cleanKey = payload.key?.trim() || (payload.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

  const body = {
    name: payload.name?.trim(),
    key: cleanKey,
    inputType: payload.inputType || "TEXT",
    unit: payload.unit || null,
    active: payload.active !== undefined ? Boolean(payload.active) : true,
  };

  let updated = null;
  if (isRemoteId(id)) {
    try {
      const res = await api.put(`/specifications/${id}`, body);
      updated = res.data?.data || res.data;
    } catch (err) {
      console.warn(`PUT /specifications/${id} notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const existing = getStoredSpecifications();
  const target = existing.find((s) => String(s.id) === String(id)) || {};
  updated = {
    ...target,
    ...body,
    id,
    options: target.options || [],
    updatedAt: new Date().toISOString(),
  };

  const list = existing.map((s) => (String(s.id) === String(id) ? { ...s, ...updated } : s));
  setStoredSpecifications(list);

  dispatchDataUpdate("specifications", "UPDATE", updated);
  invalidateRequest("specifications");

  return updated;
};

/**
 * 1.5 Deactivate / Delete Specification Master (DELETE /api/specifications/{id})
 */
export const deleteSpecification = async (id) => {
  if (isRemoteId(id)) {
    try {
      await api.delete(`/specifications/${id}`);
    } catch (err) {
      console.warn(`DELETE /specifications/${id} notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const existing = getStoredSpecifications();
  const filtered = existing.filter((s) => String(s.id) !== String(id));
  setStoredSpecifications(filtered);

  dispatchDataUpdate("specifications", "DELETE", { id });
  invalidateRequest("specifications");

  return { success: true, id };
};

/* ==========================================================================
   2. SPECIFICATION OPTION APIs (/api/specifications/{id}/options)
   ========================================================================== */

/**
 * 2.1 Add Predefined Option (POST /api/specifications/{id}/options)
 * Payload: { value: "Fe 600", displayOrder: 5 }
 */
export const addSpecificationOption = async (specId, payload) => {
  const optVal = String(payload.optionValue || payload.value || "").trim();
  const body = {
    optionValue: optVal,
    value: optVal,
    displayOrder: Number(payload.displayOrder || 1),
  };

  let createdOption = null;
  if (isRemoteId(specId)) {
    try {
      const res = await api.post(`/specifications/${specId}/options`, body);
      createdOption = res.data?.data || res.data;
    } catch (err) {
      console.warn(`POST /specifications/${specId}/options notice:`, err?.response?.data?.message || err?.message);
    }
  }

  if (!createdOption || !createdOption.id) {
    createdOption = {
      id: Date.now(),
      optionValue: body.optionValue,
      value: body.value,
      displayOrder: body.displayOrder,
    };
  }

  const existing = getStoredSpecifications();
  const updatedList = existing.map((spec) => {
    if (String(spec.id) === String(specId)) {
      const curOptions = Array.isArray(spec.options) ? [...spec.options] : [];
      return {
        ...spec,
        options: [...curOptions, createdOption],
      };
    }
    return spec;
  });
  setStoredSpecifications(updatedList);

  dispatchDataUpdate("specifications", "UPDATE_OPTION", { specId, option: createdOption });
  invalidateRequest("specifications");

  return createdOption;
};

/**
 * 2.2 Get All Options for Specification (GET /api/specifications/{id}/options)
 */
export const getSpecificationOptions = async (specId) => {
  if (isRemoteId(specId)) {
    try {
      const res = await api.get(`/specifications/${specId}/options`);
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) return data;
    } catch (err) {
      console.warn(`GET /specifications/${specId}/options notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const spec = (getStoredSpecifications() || []).find((s) => String(s.id) === String(specId));
  return spec?.options || [];
};

/**
 * 2.3 Update Option (PUT /api/specifications/{id}/options/{optionId})
 * Payload: { value: "Fe 600 High-Yield", displayOrder: 5 }
 */
export const updateSpecificationOption = async (specId, optionId, payload) => {
  const body = {
    value: String(payload.value || "").trim(),
    displayOrder: Number(payload.displayOrder || 1),
  };

  let updatedOption = null;
  if (isRemoteId(specId) && isRemoteId(optionId)) {
    try {
      const res = await api.put(`/specifications/${specId}/options/${optionId}`, body);
      updatedOption = res.data?.data || res.data;
    } catch (err) {
      console.warn(`PUT /specifications/${specId}/options/${optionId} notice:`, err?.response?.data?.message || err?.message);
    }
  }

  if (!updatedOption) {
    updatedOption = { id: optionId, ...body };
  }

  const existing = getStoredSpecifications();
  const updatedList = existing.map((spec) => {
    if (String(spec.id) === String(specId)) {
      const curOptions = (spec.options || []).map((opt) =>
        String(opt.id) === String(optionId) ? { ...opt, ...body } : opt
      );
      return { ...spec, options: curOptions };
    }
    return spec;
  });
  setStoredSpecifications(updatedList);

  dispatchDataUpdate("specifications", "UPDATE_OPTION", { specId, option: updatedOption });
  invalidateRequest("specifications");

  return updatedOption;
};

/**
 * 2.4 Delete Option (DELETE /api/specifications/{id}/options/{optionId})
 */
export const deleteSpecificationOption = async (specId, optionId) => {
  if (isRemoteId(specId) && isRemoteId(optionId)) {
    try {
      await api.delete(`/specifications/${specId}/options/${optionId}`);
    } catch (err) {
      console.warn(`DELETE /specifications/${specId}/options/${optionId} notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const existing = getStoredSpecifications();
  const updatedList = existing.map((spec) => {
    if (String(spec.id) === String(specId)) {
      return {
        ...spec,
        options: (spec.options || []).filter((opt) => String(opt.id) !== String(optionId)),
      };
    }
    return spec;
  });
  setStoredSpecifications(updatedList);

  dispatchDataUpdate("specifications", "DELETE_OPTION", { specId, optionId });
  invalidateRequest("specifications");

  return { success: true, specId, optionId };
};

/* ==========================================================================
   3. CATEGORY ↔ SPECIFICATION MAPPING APIs (/api/categories/{categoryId}/specifications)
   ========================================================================== */

/**
 * 3.1 Map a Specification to a Category (POST /api/categories/{categoryId}/specifications)
 * Payload: { specificationId: 1, required: true, displayOrder: 1, active: true }
 */
export const mapCategorySpecification = async (categoryId, payload) => {
  const body = {
    specificationId: Number(payload.specificationId),
    required: Boolean(payload.required),
    displayOrder: Number(payload.displayOrder || 1),
    active: payload.active !== undefined ? Boolean(payload.active) : true,
  };

  let mapped = null;
  if (isRemoteId(categoryId)) {
    try {
      const res = await api.post(`/categories/${categoryId}/specifications`, body);
      mapped = res.data?.data || res.data;
    } catch (err) {
      console.warn(`POST /categories/${categoryId}/specifications notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const allSpecs = getStoredSpecifications();
  const matchedSpec = allSpecs.find((s) => String(s.id) === String(body.specificationId)) || {};

  if (!mapped || !mapped.mappingId) {
    mapped = {
      id: matchedSpec.id || body.specificationId,
      mappingId: Date.now(),
      categoryId: Number(categoryId),
      name: matchedSpec.name || "Specification",
      key: matchedSpec.key || "spec",
      inputType: matchedSpec.inputType || "TEXT",
      unit: matchedSpec.unit || null,
      required: body.required,
      displayOrder: body.displayOrder,
      active: body.active,
      options: (matchedSpec.options || []).map((o) => (typeof o === "string" ? o : o.value || "")),
    };
  }

  const allCategoryMappings = getStoredCategorySpecs();
  const currentList = allCategoryMappings[categoryId] || [];
  const updatedList = [
    ...currentList.filter((m) => String(m.id || m.specificationId) !== String(body.specificationId)),
    mapped,
  ].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  allCategoryMappings[categoryId] = updatedList;
  setStoredCategorySpecs(allCategoryMappings);

  dispatchDataUpdate("category_specifications", "MAP", { categoryId, mapping: mapped });
  invalidateRequest("category_specifications");

  return mapped;
};

/**
 * 3.2 Get Active Specifications for Category (GET /api/categories/{categoryId}/specifications)
 * Query Params: activeOnly=true (default true)
 */
export const getCategorySpecifications = async (categoryId, params = { activeOnly: true }) => {
  if (!categoryId) return [];

  if (isRemoteId(categoryId)) {
    try {
      const res = await api.get(`/categories/${categoryId}/specifications`, { params });
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        const allCategoryMappings = getStoredCategorySpecs();
        allCategoryMappings[categoryId] = data;
        setStoredCategorySpecs(allCategoryMappings);
        return data;
      }
    } catch (err) {
      console.warn(`GET /categories/${categoryId}/specifications notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const allCategoryMappings = getStoredCategorySpecs();
  let list = allCategoryMappings[categoryId] || allCategoryMappings[String(categoryId)] || [];

  if (list.length === 0) {
    // If no specific mapping stored for category, check fallback or return empty
    const fallback = allCategoryMappings["1"] || [];
    if (String(categoryId) === "1" || fallback.length > 0) {
      list = fallback.map((f) => ({ ...f, categoryId: Number(categoryId) }));
    }
  }

  if (params.activeOnly !== false && params.activeOnly !== "false") {
    list = list.filter((m) => m.active !== false);
  }

  return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
};

/**
 * 3.3 Update Category Specification Mapping (PUT /api/categories/{categoryId}/specifications/{specificationId})
 * Payload: { required: false, displayOrder: 5, active: true }
 */
export const updateCategorySpecification = async (categoryId, specificationId, payload) => {
  const body = {
    required: Boolean(payload.required),
    displayOrder: Number(payload.displayOrder || 1),
    active: payload.active !== undefined ? Boolean(payload.active) : true,
  };

  let updated = null;
  if (isRemoteId(categoryId) && isRemoteId(specificationId)) {
    try {
      const res = await api.put(`/categories/${categoryId}/specifications/${specificationId}`, body);
      updated = res.data?.data || res.data;
    } catch (err) {
      console.warn(`PUT /categories/${categoryId}/specifications/${specificationId} notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const allCategoryMappings = getStoredCategorySpecs();
  const currentList = allCategoryMappings[categoryId] || [];
  const updatedList = currentList.map((item) => {
    if (String(item.id || item.specificationId) === String(specificationId)) {
      return {
        ...item,
        ...body,
        specificationId: Number(specificationId),
      };
    }
    return item;
  }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  allCategoryMappings[categoryId] = updatedList;
  setStoredCategorySpecs(allCategoryMappings);

  dispatchDataUpdate("category_specifications", "UPDATE", { categoryId, specificationId, ...body });
  invalidateRequest("category_specifications");

  return updated || updatedList.find((i) => String(i.id || i.specificationId) === String(specificationId));
};

/**
 * 3.4 Remove Specification from Category (DELETE /api/categories/{categoryId}/specifications/{specificationId})
 */
export const deleteCategorySpecification = async (categoryId, specificationId) => {
  if (isRemoteId(categoryId) && isRemoteId(specificationId)) {
    try {
      await api.delete(`/categories/${categoryId}/specifications/${specificationId}`);
    } catch (err) {
      console.warn(`DELETE /categories/${categoryId}/specifications/${specificationId} notice:`, err?.response?.data?.message || err?.message);
    }
  }

  const allCategoryMappings = getStoredCategorySpecs();
  const currentList = allCategoryMappings[categoryId] || [];
  const filtered = currentList.filter(
    (item) => String(item.id || item.specificationId) !== String(specificationId)
  );

  allCategoryMappings[categoryId] = filtered;
  setStoredCategorySpecs(allCategoryMappings);

  dispatchDataUpdate("category_specifications", "DELETE", { categoryId, specificationId });
  invalidateRequest("category_specifications");

  return { success: true, categoryId, specificationId };
};

/**
 * 3.5 Batch Configure Category Specifications (PUT /api/categories/{categoryId}/specifications)
 * Payload: [ { specificationId: 1, required: true, displayOrder: 1, active: true }, ... ]
 */
export const batchConfigureCategorySpecifications = async (categoryId, payload = []) => {
  const cleanPayload = (payload || []).map((item, idx) => ({
    specificationId: Number(item.specificationId || item.id),
    required: Boolean(item.required),
    displayOrder: Number(item.displayOrder !== undefined ? item.displayOrder : idx + 1),
    active: item.active !== undefined ? Boolean(item.active) : true,
  }));

  let result = null;
  if (isRemoteId(categoryId)) {
    try {
      // 1. Try POST /api/categories/{categoryId}/specifications/batch
      const res = await api.post(`/categories/${categoryId}/specifications/batch`, cleanPayload);
      result = res.data?.data || res.data;
    } catch (postErr) {
      try {
        // 2. Fallback to PUT /api/categories/{categoryId}/specifications
        const res = await api.put(`/categories/${categoryId}/specifications`, cleanPayload);
        result = res.data?.data || res.data;
      } catch (putErr) {
        console.warn(`Category batch specifications notice:`, putErr?.response?.data?.message || putErr?.message);
      }
    }
  }

  const allSpecs = getStoredSpecifications();
  const resolvedList = cleanPayload.map((item) => {
    const spec = allSpecs.find((s) => String(s.id) === String(item.specificationId)) || {};
    return {
      id: item.specificationId,
      mappingId: item.mappingId || Date.now() + Math.floor(Math.random() * 1000),
      categoryId: Number(categoryId),
      name: spec.name || "Specification",
      key: spec.key || "spec",
      inputType: spec.inputType || "TEXT",
      unit: spec.unit || null,
      required: item.required,
      displayOrder: item.displayOrder,
      active: item.active,
      options: (spec.options || []).map((o) => (typeof o === "string" ? o : o.value || "")),
    };
  }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const allCategoryMappings = getStoredCategorySpecs();
  allCategoryMappings[categoryId] = resolvedList;
  setStoredCategorySpecs(allCategoryMappings);

  dispatchDataUpdate("category_specifications", "BATCH_CONFIG", { categoryId, specifications: resolvedList });
  invalidateRequest("category_specifications");

  return Array.isArray(result) && result.length > 0 ? result : resolvedList;
};
