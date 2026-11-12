const { handleApiRequest } = require('../lib/backend');

module.exports = async (req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost');
  const rawPath = reqUrl.searchParams.get('__path');
  const apiPath = rawPath
    ? '/api/' + String(rawPath).replace(/^\/+/, '')
    : decodeURI(reqUrl.pathname);

  return handleApiRequest(req, res, apiPath);
};
