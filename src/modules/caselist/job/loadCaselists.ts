import { caselistApi } from "app/lib/caselist"

export const loadCaselists = async () => {
  const caselists = await caselistApi.getCaselists();
    return caselists.body;
}