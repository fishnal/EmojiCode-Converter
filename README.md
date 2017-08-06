# EmojiCode-Converter
A tool made to convert plain text into suitable code for the EmojiCode language

`.emojie` files can be written in ASCII and then converted into suitable `.emojic` files. Emojis are interpreted through
short-hand identifiers. For example, `: checkered_flag :` (excluding the spaces) would be converted into 🏁. The converter does not guarantee that the `.emojie` files, when converted into `.emojic` files, are compilable.

## Usage
### Java
```
java -jar EmojiConverter.jar [-update | -u] [files.emojie]
```
### JavaScript (Node)
```
node EmojiConverter.js [-update | -u] [files.emojie]
```
The modules require in the JavaScript implementation have not yet been exported, so the only way to make it work is to install the following modules
- npm i cheerio
- npm i sync_request

For all languages, either the update or files.emojie argument must be present in order for the program to do something.

Both JavaScript and Java use synchronous requests instead of asynchronous requests in order to maintain the a guaranteed, static flow of the program. This does, however, pose the issue of the program hanging. As such, they should not be used in web applications if applicable.
