"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = session;
var _utils = require("../lib/utils");
async function session(params) {
  const {
    options,
    sessionStore,
    newSession,
    isUpdate
  } = params;
  const {
    adapter,
    jwt,
    events,
    callbacks,
    logger,
    session: {
      strategy: sessionStrategy,
      maxAge: sessionMaxAge
    }
  } = options;
  const response = {
    body: {},
    headers: [{
      key: "Content-Type",
      value: "application/json"
    }],
    cookies: []
  };
  const sessionToken = sessionStore.value;
  if (!sessionToken) return response;
  if (sessionStrategy === "jwt") {
    try {
      var _response$cookies, _events$session;
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
      const decodedNewTokenPayload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64url').toString('utf8'));
      const newExpires = new Date(decodedNewTokenPayload.exp * 1000);
      const token = await callbacks.jwt({
        token: decodedNewTokenPayload,
        ...(isUpdate && {
          trigger: "update"
        }),
        session: newSession
      });
      const updatedSession = await callbacks.session({
        session: {
          user: {
            name: decodedNewTokenPayload === null || decodedNewTokenPayload === void 0 ? void 0 : decodedNewTokenPayload.name,
            email: decodedNewTokenPayload === null || decodedNewTokenPayload === void 0 ? void 0 : decodedNewTokenPayload.email,
            image: decodedNewTokenPayload === null || decodedNewTokenPayload === void 0 ? void 0 : decodedNewTokenPayload.image
          },
          expires: newExpires.toISOString()
        },
        token
      });
      response.body = updatedSession;
      const sessionCookies = sessionStore.chunk(sessionToken, {
        expires: newExpires
      });
      (_response$cookies = response.cookies) === null || _response$cookies === void 0 || _response$cookies.push(...sessionCookies);
      await ((_events$session = events.session) === null || _events$session === void 0 ? void 0 : _events$session.call(events, {
        session: updatedSession,
        token
      }));
    } catch (error) {
      var _response$cookies2;
      logger.error("JWT_SESSION_ERROR", error);
      (_response$cookies2 = response.cookies) === null || _response$cookies2 === void 0 || _response$cookies2.push(...sessionStore.clean());
    }
  } else {
    try {
      const {
        getSessionAndUser,
        deleteSession,
        updateSession
      } = adapter;
      let userAndSession = await getSessionAndUser(sessionToken);
      if (userAndSession && userAndSession.session.expires.valueOf() < Date.now()) {
        await deleteSession(sessionToken);
        userAndSession = null;
      }
      if (userAndSession) {
        var _response$cookies3, _events$session2;
        const {
          user,
          session
        } = userAndSession;
        const sessionUpdateAge = options.session.updateAge;
        const sessionIsDueToBeUpdatedDate = session.expires.valueOf() - sessionMaxAge * 1000 + sessionUpdateAge * 1000;
        const newExpires = (0, _utils.fromDate)(sessionMaxAge);
        if (sessionIsDueToBeUpdatedDate <= Date.now()) {
          await updateSession({
            sessionToken,
            expires: newExpires
          });
        }
        const sessionPayload = await callbacks.session({
          session: {
            user: {
              name: user.name,
              email: user.email,
              image: user.image
            },
            expires: session.expires.toISOString()
          },
          user,
          newSession,
          ...(isUpdate ? {
            trigger: "update"
          } : {})
        });
        response.body = sessionPayload;
        (_response$cookies3 = response.cookies) === null || _response$cookies3 === void 0 || _response$cookies3.push({
          name: options.cookies.sessionToken.name,
          value: sessionToken,
          options: {
            ...options.cookies.sessionToken.options,
            expires: newExpires
          }
        });
        await ((_events$session2 = events.session) === null || _events$session2 === void 0 ? void 0 : _events$session2.call(events, {
          session: sessionPayload
        }));
      } else if (sessionToken) {
        var _response$cookies4;
        (_response$cookies4 = response.cookies) === null || _response$cookies4 === void 0 || _response$cookies4.push(...sessionStore.clean());
      }
    } catch (error) {
      logger.error("SESSION_ERROR", error);
    }
  }
  return response;
}