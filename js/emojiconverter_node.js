const args = process.argv;
if (args.length < 3) {
	console.log("usage: node emojiconverter_node.js [-update | -u] [files.emojie]");
	return 1;
}

const fs = require('fs');
const EMOJI_MAP = [];

{
	if (fs.existsSync('emojimap.data')) {
		var buffer = fs.readFileSync('emojimap.data');
		var content = buffer.toString('utf8');
		var prev = 0;
		var asterisk = -1;
		while ((asterisk = content.indexOf("*", asterisk + 1)) != -1) {
			var emojiData = content.substring(prev, asterisk);
			var breakIndex = emojiData.indexOf("|");
			var shorthands = emojiData.substring(0, breakIndex);
			var codes = emojiData.substring(breakIndex + 1);
			shorthands = shorthands.split(", ");
			codes = codes.split(", ");
			EMOJI_MAP.push({key:shorthands,value:codes});
			prev = asterisk + 1;
		}
	} else {
		// because emojimap.data doesn't exist, remap the emojis
		throw new Error("update process not available");
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
		outer:for (var i = 0; i < EMOJI_MAP.length; i++) {
			var obj = EMOJI_MAP[i];
			var key = obj.key;
			for (var j = 0; j < key.length; j++) {
				if (key[j] == identifier) {
					codes = obj.value;
					break outer;
				}
			}
		}

		if (!codes) {
			console.err("invalid emoji identifier -> " + identifier + " in \"" + path.resolve(file) + "\" @ [" + first + "," + second + "]");
			return;
		}

		var emoji = String.fromCodePoint(parseInt(codes[0], 16));
		content = content.substring(0, first) + emoji + content.substring(second + 1);
	}

	buffer = Buffer.from(content, 'utf8');
	fs.writeFileSync(parent + "/" + name + ".emojic", buffer);
	console.log("converted " + filePath);
});