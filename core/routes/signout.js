"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = signout;
async function signout(params) {
  const {
    options,
    sessionStore
  } = params;
  const {
    adapter,
    events,
    jwt,
    callbackUrl,
    logger,
    session
  } = options;
  const sessionToken = sessionStore === null || sessionStore === void 0 ? void 0 : sessionStore.value;
  if (!sessionToken) {
    return {
      redirect: callbackUrl
    };
  }
  if (session.strategy === "jwt") {
    try {
      const awsResponse = await fetch("https://spring-api.timeline.vg/v1/user/info", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'lang': 'en'
        }
      });
      const data = await awsResponse.json();
      if (data.code == !200) throw new Error("JWT invalid");
    } catch (error) {
      logger.error("SIGNOUT_ERROR", error);
    }
  } else {
    try {
      var _events$signOut;
      const session = await adapter.deleteSession(sessionToken);
      await ((_events$signOut = events.signOut) === null || _events$signOut === void 0 ? void 0 : _events$signOut.call(events, {
        session
      }));
    } catch (error) {
      logger.error("SIGNOUT_ERROR", error);
    }
  }
  const sessionCookies = sessionStore.clean();
  return {
    redirect: callbackUrl,
    cookies: sessionCookies
  };
}