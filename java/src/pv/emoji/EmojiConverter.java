package pv.emoji;

import java.util.*;
import java.io.*;
import java.net.*;

import org.jsoup.*;
import org.jsoup.nodes.*;
import org.jsoup.select.*;

public class EmojiConverter {
	private static Map<String[], Integer[]> EMOJI_MAP = new HashMap<>();
	private static Set<String[]> EMOJI_KEYS;

	public static void main(String[] args) throws Exception {
		if (args == null || args.length == 0) {
			System.err.println("usage: java -jar EmojiConverter.jar [-update | -u] [files.emojie]");
			System.exit(1);
		}

		// search for update option
		for (String s : args) {
			if (s.equals("-u") || s.equals("-update")) {
				System.out.println("Updating data");
				updateEmojiMap(new File("emojimap.data"));
				break;
			}
		}

		try {
			EMOJI_MAP = retrieveEmojiMap(new File("emojimap.data"));
			System.out.println("retrieved data");
		} catch (Exception e) {
			System.out.println("updating data");
			updateEmojiMap(new File("emojimap.data"));
		}
		EMOJI_KEYS = EMOJI_MAP.keySet();

		// convert the emojij file(s)
		for (String s : args) {
			if (s.equals("-u") || s.equals("-update")) {
				continue;
			}

			try {
				convertEmojieToEmojic(new File(s));
				System.out.println("converted " + new File(s).getAbsoluteFile());
			} catch (Exception e) {
				e.printStackTrace(System.err);
				System.err.println();
			}
		}
	}

	static Map<String[], Integer[]> retrieveEmojiMap(File localPath) throws Exception {
		try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(localPath))) {
			Object obj = ois.readObject();
			try {
				return (Map<String[], Integer[]>) obj;
			} catch (ClassCastException cce) {
				throw cce;
			}
		} catch (Exception e) {
			throw e;
		}
	}

	static void updateEmojiMap(File updatePath) throws Exception {
		String baseURL = "https://emojipedia.org";
		File responseDataCache = new File("cache");
		responseDataCache.deleteOnExit();
		{
			System.out.println("retrieving emoji data");
			InputStream is = new URL(baseURL + "/emoji/").openStream();
			FileOutputStream fos = new FileOutputStream(responseDataCache);
			int data;
			while ((data = is.read()) != -1) {
				fos.write(data);
				fos.flush();
			}
			fos.close();
			is.close();
		}
		System.out.println("parsing grouped emoji data");
		Document doc = Jsoup.parse(responseDataCache, null);
		Element emojiList = doc.getElementsByClass("emoji-list").get(0);
		Elements rows = emojiList.getElementsByTag("tr");
		int size = rows.size();
		System.out.print("parsing individual emoji data [");
		for (int index = 0; index < size; index++) {
			try {
				Element row = rows.get(index);
				String emojiURL = row.getElementsByTag("a").get(0).attr("href");
				String data = row.getElementsByTag("td").get(1).html();
				String[] split = data.split(", ");
				Integer[] charData = new Integer[split.length];
				for (int i = 0; i < split.length; i++) {
					String s = split[i];
					s = s.substring(2);
					int code = Integer.parseInt(s, 16);
					charData[i] = code;
				}

				try {
					{
						InputStream is = new URL(baseURL + emojiURL).openStream();
						FileOutputStream fos = new FileOutputStream(responseDataCache);
						int d;
						while ((d = is.read()) != -1) {
							fos.write(d);
							fos.flush();
						}
						fos.close();
						is.close();
					}
					Document emojiDoc = Jsoup.parse(responseDataCache, null);
					Elements sces = emojiDoc.getElementsByClass("shortcodes");
					if (sces == null || sces.size() == 0) {
						continue;
					}
					String rawCodes = sces.get(0).html();
					String[] codes = rawCodes.split(", ");
					EMOJI_MAP.put(codes, charData);
				} catch (Exception e) {
					System.out.println(baseURL + emojiURL);
					e.printStackTrace();
					System.out.println();
				}
			} catch (Exception e) {
				System.out.println(index);
				System.out.println(rows.get(index));
				e.printStackTrace();
				System.out.println();
			}

			if (index + 1 % size / 10 == 0) {
				System.out.print(".");
			}
		}
		System.out.println("]");

		try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(updatePath))) {
			oos.writeObject(EMOJI_MAP);
			oos.flush();
		} catch (Exception e) {
			throw e;
		}
	}

	// https://stackoverflow.com/questions/2946067/what-is-the-java-equivalent-to-javascripts-string-fromcharcode?rq=1
	static String fromCharCode(int... codePoints) {
		return new String(codePoints, 0, codePoints.length);
	}

	static void convertEmojieToEmojic(File file) throws Exception {
		String fullName = file.getName();
		int dotIndex = fullName.lastIndexOf(".");
		String baseName = fullName.substring(0, dotIndex);
		String extension = fullName.substring(dotIndex + 1);
		if (!extension.equals("emojie")) {
			throw new Exception(file.getAbsoluteFile() + " must be an emojie file");
		}
		String newFullName = baseName + ".emojic";
		File newFile = new File(file.getAbsoluteFile().getParent() + "/" + newFullName);

		Scanner in = new Scanner(file);
		FileOutputStream fos = new FileOutputStream(newFile);

		while (in.hasNextLine()) {
			String line = in.nextLine();
			// line = new String(line.getBytes(), java.nio.charset.StandardCharsets.US_ASCII);

			// find emoji identifiers -> :emoji_short_hand:
			// avoid colons that are escaped with a backslash "\"
			while (true) {
				int first = line.indexOf(":");
				while (first > 0 && line.charAt(first - 1) == '\\') {
					first = line.indexOf(":", first + 1);
				}
				if (first == -1) {
					break;
				}

				int second = line.indexOf(":", first + 1);
				while (second > 0 && line.charAt(second - 1) == '\\') {
					second = line.indexOf(":", second + 1);
				}
				if (second == -1) {
					break;
				}

				String idenitifer = line.substring(first, second+1);
				String[] key = null;
				out:for (String[] keyArr : EMOJI_KEYS) {
					for (String key2 : keyArr) {
						if (idenitifer.equals(key2)) {
							key = keyArr;
							break out;
						}
					}
				}
				Integer[] emojiCodePoints = EMOJI_MAP.get(key);
				// use first code point
				int codePoint = emojiCodePoints[0];

				line = line.substring(0, first) + fromCharCode(codePoint) + line.substring(second + 1);
			}

			fos.write((line + "\n").getBytes("utf-8"));
			fos.flush();
		}

		in.close();
		fos.close();
	}
}