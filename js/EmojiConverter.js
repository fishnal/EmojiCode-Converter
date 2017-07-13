const args = process.argv;
if (args.length < 3) {
	console.log("usage: node emojiconverter_node.js [-update | -u] [files.emojie]");
	return 1;
}

const fs = require('fs');
var EMOJI_MAP = [];

{
	if (fs.existsSync('emojimap.data')) {
		var buffer = fs.readFileSync('emojimap.data');
		var content = buffer.toString('utf8');
		EMOJI_MAP = JSON.parse(content);
		console.log('emoji data parsed');
	} else {
		// because emojimap.data doesn't exist, remap the emojis
		console.log('emojimap.data not found, retrieving this data');
		var cheerio = require('cheerio');
		var sync_request = require('sync-request');

		/**
		* Filters nodes out of a parent node based on the tag name. The tag names are not case sensitive.
		* @param {Node} node - the parent node to filter the other nodes from. 
		* @param {String} tagName - the tag name to filter.
		* @return {Array} an array of the nodes filtered by a tag name.
		*/
		function filterByTag(node, tagName) {
			var filtered = [];
			
			function filterByTag0(node) {
				if (node.type == "tag" && String(node.tagName).toUpperCase() == String(tagName).toUpperCase()) {
					filtered.push(node);
				}

				if (node.childNodes == null) {
					return;
				}

				node.childNodes.forEach(childNode => {
					filterByTag0(childNode);
				})
			}

			filterByTag0(node);

			return filtered.length == 0 ? null : filtered;
		}

		var baseURL = 'https://emojipedia.org';
		var bulkURL = '/emoji/';

		console.log('retreiving bulk emoji data');
		var request = sync_request('GET', baseURL + bulkURL);
		var rawHTML = request.getBody();
		request = bulkURL = null;

		console.log('parsing bulk emoji data');
		var doc = cheerio.load(rawHTML);
		rawHTML = null;

		console.log('filtering out individual emoji data');
		var table = doc('table.emoji-list')[0];
		doc = null;
		var trFilter = filterByTag(table, 'tr');
		var individualEmojiData = [];
		trFilter.forEach(trElement => {
			var tds = filterByTag(trElement, 'td');
			var href = tds[0].children[0].attribs.href;
			var text = tds[1].children[0].data;

			individualEmojiData.push([ href, text ]);
		});

		console.log('processing individual emoji data');
		individualEmojiData.forEach(iedElement => {
			var href = iedElement[0];
			var text = iedElement[1];

			var charCodes = text.split(', ');

			for (var i = 0; i < charCodes.length; i++) {
				var cc = charCodes[i];
				cc = cc.replace('U+', '0x');
				cc = parseInt(cc);
				charCodes[i] = cc;
			}

			try {
				request = sync_request('GET', baseURL + href);
			} catch (err) {
				console.error("ERROR: " + baseURL +  href + " -> " + err.message);
			}
			
			rawHTML = request.getBody();

			doc = cheerio.load(rawHTML);
			rawHTML = null;
			var scsElement = doc('.shortcodes');
			if (!scsElement || scsElement.length == 0) {
				return;
			}
			scsElement = scsElement[0];
			var scs = scsElement.children[0].nodeValue.split(', ');
			EMOJI_MAP.push({ key:scs, value:charCodes });
			console.log('finished ' + baseURL + href);
		});

		console.log('finalizing emoji data');
		var jsonString = JSON.stringify(EMOJI_MAP);
		var buffer = Buffer.from(jsonString);
		fs.writeFileSync('emojimap.data', jsonString);

		console.log('finished updating emoji data');
	}
}

const path = require('path');
var files = args.slice(2);
files.forEach((file, index, array) => {
	var filePath = path.resolve(file);
	var parent = path.dirname(filePath);
	var name = path.basename(filePath, ".emojie");
	if (name == path.basename(filePath)) {
		console.log("invalid file extension for \"" + filePath + "\", must use .emojie extension");
		return;
	}
	var buffer = fs.readFileSync(file);
	var content = buffer.toString('utf8');

	while (true) {
		var first = content.indexOf(":");
		while (first > 0 && content.charAt(first - 1) == '\\') {
			first = content.indexOf(":", first + 1);
		}
		if (first == -1) {
			break;
		}

		var second = content.indexOf(":", first + 1);
		while (second > 0 && content.charAt(second - 1) == '\\') {
			second = content.indexOf(":", second + 1);
		}
		if (second == -1) {
			break;
		}

		var identifier = content.substring(first, second+1);
		var codes = undefined;
		for (var i = 0; i < EMOJI_MAP.length; i++) {
			var obj = EMOJI_MAP[i];
			var key = obj.key;
			if (key.indexOf(identifier) == -1) {
				continue;
			}
			codes = obj.value;
			break;
		}

		if (!codes) {
			console.err("invalid emoji identifier -> " + identifier + " in \"" + path.resolve(file) + "\" @ [" + first + "," + second + "]");
			return;
		}

		var emoji = String.fromCodePoint(codes[0]);
		content = content.substring(0, first) + emoji + content.substring(second + 1);
	}

	buffer = Buffer.from(content, 'utf8');
	fs.writeFileSync(parent + "/" + name + ".emojic", buffer);
	console.log("converted " + filePath);
});