/**
 * mapserverProxyService.js
 *
 * Frontend service that routes all MapServer API calls through the secure backend proxy.
 * This ensures:
 * 1. All requests are authenticated with JWT token
 * 2. Direct access to MapServer from client is impossible
 * 3. All access is logged and audited
 * 4. Download/export operations are blocked
 *
 * Usage:
 *   import { queryMapServer, identifyMapServer } from '@/services/mapserverProxyService';
 *   const result = await queryMapServer({
 *     layerId: 26,
 *     where: "n_d_code='09'",
 *     outFields: ['n_d_name'],
 *   });
 */

import axiosInstance from '@/utils/axiosInstance';

const BASE_PATH = '/mapserver';

/**
 * Execute a query against MapServer through the backend proxy
 * @param {Object} params - Query parameters
 * @param {number} params.layerId - Layer ID to query
 * @param {string} params.where - WHERE clause (SQL)
 * @param {string[]} params.outFields - Fields to return
 * @param {boolean} params.returnGeometry - Include geometry in response (default: false)
 * @param {number} params.resultOffset - Pagination offset
 * @param {number} params.resultRecordCount - Pagination limit
 * @returns {Promise} Query result from MapServer
 */
export const queryMapServer = async (params) => {
  try {
    const response = await axiosInstance.post(`${BASE_PATH}/query`, {
      endpoint: 'query',
      ...params,
    });
    return response.data;
  } catch (error) {
    console.error('MapServer query error:', error);
    throw new Error(
      error.response?.data?.error ||
      error.message ||
      'MapServer query failed'
    );
  }
};

/**
 * Execute an identify request against MapServer
 * @param {Object} params - Identify parameters
 * @param {Object} params.geometry - Geometry to identify at (point, extent, etc.)
 * @param {string} params.geometryType - Type of geometry ('esriGeometryPoint', etc.)
 * @param {number[]} params.layerIds - Layer IDs to identify on
 * @param {number} params.tolerance - Tolerance in screen pixels
 * @param {string[]} params.outFields - Fields to return
 * @returns {Promise} Identify result from MapServer
 */
export const identifyMapServer = async (params) => {
  try {
    const response = await axiosInstance.post(`${BASE_PATH}/identify`, {
      endpoint: 'identify',
      ...params,
    });
    return response.data;
  } catch (error) {
    console.error('MapServer identify error:', error);
    throw new Error(
      error.response?.data?.error ||
      error.message ||
      'MapServer identify failed'
    );
  }
};

/**
 * Call a Land Record ASMX API method
 * @param {string} method - Method name (GetKhewats, GetJamabandiPeriod, Owner_name, etc.)
 * @param {Object} params - Query parameters
 * @returns {Promise} API result
 */
export const callLandRecordAPI = async (method, params = {}) => {
  try {
    const response = await axiosInstance.get(`${BASE_PATH}/land-record/${method}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error(`Land Record API error (${method}):`, error);
    throw new Error(
      error.response?.data?.error ||
      error.message ||
      `Land Record API call failed: ${method}`
    );
  }
};

/**
 * Get the legend (symbology swatches + labels) for a proxied map service.
 * @param {string} serviceKey - Service key registered in the backend proxy (e.g. 'kanalMarla')
 * @returns {Promise} Legend payload ({ layers: [{ legend: [{ label, imageData, contentType }] }] })
 */
export const getMapServiceLegend = async (serviceKey) => {
  try {
    const response = await axiosInstance.get(`${BASE_PATH}/service/${serviceKey}/legend`, {
      params: { f: 'json' },
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    if (import.meta.env.DEV && status !== 404) {
      console.warn(`Map service legend warning (${serviceKey}):`, error);
    }

    const legendError = new Error(
      error.response?.data?.error ||
      error.message ||
      `Could not load legend for ${serviceKey}`
    );
    legendError.status = status;
    throw legendError;
  }
};

/**
 * Get MapServer metadata (layers, fields, etc.)
 * @returns {Promise} MapServer metadata
 */
export const getMapServerMetadata = async () => {
  try {
    const response = await axiosInstance.get(`${BASE_PATH}/metadata`);
    return response.data;
  } catch (error) {
    console.error('MapServer metadata error:', error);
    throw new Error(
      error.response?.data?.error ||
      error.message ||
      'Could not load MapServer metadata'
    );
  }
};

/**
 * Helper: Convert ArcGIS SDK Query object to proxy params
 * Used for migration from direct SDK calls to proxied calls
 */
export const convertQueryToProxyParams = (query, layerId) => {
  return {
    layerId,
    where: query.where || '1=1',
    outFields: query.outFields || ['*'],
    returnGeometry: query.returnGeometry !== false,
    returnDistinctValues: query.returnDistinctValues || false,
    orderByFields: (query.orderByFields || []).join(','),
    resultOffset: query.resultOffset || 0,
    resultRecordCount: query.resultRecordCount || 10000,
  };
};

export default {
  queryMapServer,
  identifyMapServer,
  callLandRecordAPI,
  getMapServerMetadata,
  convertQueryToProxyParams,
};
