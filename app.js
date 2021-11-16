require("dotenv").config();

const { Kutt } = require("kutt");

const kutt_api = process.env.KUTT_API;
const kutt_key = process.env.KUTT_KEY;

const targeted_domain = process.env.TARGETED_DOMAIN;
const targeted_domain_params_prefix = process.env.TARGETED_DOMAIN_PARAMS_PREFIX;

Kutt.set("api", kutt_api).set("key", kutt_key);

const getParamsFromLink = (link, params_prefix) => {
	const url_and_params = link.split("?");
	if (url_and_params.length > 0) {
		let utmParams = {};

		url_and_params[1].split("&").forEach(param => {
			if (params_prefix != "*") {
				if (param.includes(params_prefix)) {
					const utm_key_and_value = param.split("=");
					utmParams[utm_key_and_value[0]] = utm_key_and_value[1];
				}
			} else {
				const utm_key_and_value = param.split("=");
				utmParams[utm_key_and_value[0]] = utm_key_and_value[1];
			}
		});

		return Object.keys(utmParams).length === 0 ? null : utmParams;
	}
	return null;
};

const getLinks = async () => {
	const kutt = new Kutt();
	const health = kutt.health();
	const isHealthy = await health.check();

	if (isHealthy) {
		console.log("API is healthy");

		const linksResponse = await kutt
			.links()
			.list({ all: true, limit: 100, skip: 0 });

		if (linksResponse != null && linksResponse.data.length > 0) {
			return linksResponse.data
				.filter(e =>
					targeted_domain === "*" ? true : e.target.includes(targeted_domain)
				)
				.map(e => {
					return {
						target_url: e.target,
						target_short_url: e.link,
						target_canonical_url: e.target.split("?")[0],
						visit_count: e.visit_count,
						[targeted_domain_params_prefix === "*"
							? "params"
							: targeted_domain_params_prefix]: getParamsFromLink(
							e.target,
							targeted_domain_params_prefix
						),
					};
				})
				.sort((x, y) => y.visit_count - x.visit_count);
		} else return null;
	} else {
		console.log("API is not healthy, aborted");
		return null;
	}
};

const handleLinksStats = links => {
	console.log({
		links,
		links_count: links.length,
	});
};

(async () => {
	const links = await getLinks();
	handleLinksStats(links);
})();
