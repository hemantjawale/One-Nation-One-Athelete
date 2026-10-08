/**
 * Base abstract class for external & internal sports data providers.
 * Follows provider abstraction pattern allowing pluggable sports data APIs.
 */
export class SportsDataProvider {
  constructor(name = "GenericSportsDataProvider") {
    this.name = name;
  }

  /**
   * Evaluates if this provider can handle queries for given filters
   * @param {Object} filters
   * @returns {boolean}
   */
  supports(_filters) {
    return false;
  }

  /**
   * Fetches records matching filters from the provider
   * @param {Object} filters
   * @returns {Promise<Array<Object>>} normalized records
   */
  async fetchRecords(_filters) {
    return [];
  }
}
