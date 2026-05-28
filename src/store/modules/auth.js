import { fetchSessionUser, login as apiLogin, logout as apiLogout } from "@/services/auth";

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default {
  namespaced: true,
  state: {
    user: readStoredUser(),
    token: localStorage.getItem("token"),
    sessionReady: false,
  },
  mutations: {
    SET_AUTH(state, { user, token }) {
      state.user = user ?? null;
      state.token = token ?? null;
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    },
    CLEAR_AUTH(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    SET_SESSION_READY(state, value) {
      state.sessionReady = !!value;
    },
  },
  getters: {
    canAccessAdmin(state) {
      return !!state.user?.can_access_admin_panel;
    },
    mlmRole(state) {
      return state.user?.mlm_role ?? null;
    },
    isSuperAdmin(state) {
      return state.user?.mlm_role === "superadmin";
    },
    isAdminOrSuperAdmin(state) {
      const r = state.user?.mlm_role;
      return r === "admin" || r === "superadmin";
    },
  },
  actions: {
    setAuth({ commit }, payload) {
      commit("SET_AUTH", payload);
    },
    async bootstrap({ state, commit, dispatch }) {
      if (state.sessionReady) return;
      const token = localStorage.getItem("token");
      if (!token) {
        commit("SET_SESSION_READY", true);
        return;
      }
      try {
        const user = await fetchSessionUser();
        if (user) {
          await dispatch("setAuth", { user, token });
        } else {
          await dispatch("logout");
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          await dispatch("logout");
        }
      } finally {
        commit("SET_SESSION_READY", true);
      }
    },
    async login({ dispatch }, credentials) {
      const { token, user } = await apiLogin(credentials);
      if (!token || !user) {
        throw new Error("Respuesta de login inválida");
      }
      await dispatch("setAuth", { user, token });
    },
    async logout({ commit }) {
      await apiLogout();
      commit("CLEAR_AUTH");
      commit("SET_SESSION_READY", false);
    },
  },
};
