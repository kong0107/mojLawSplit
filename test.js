const fsP = require("fs").promises;
const arrange = require("./lib/arrange");

(async() => {
    const files = (await fsP.readdir("./source")).filter(fn => fn.endsWith(".json") && fn.startsWith("Ch"));
    // const files = ["ChLaw.json"];
    // const fh = await fsP.open("test.html", "w");
    // await fh.write("<pre style=\"font-family: '細明體';\">");
    for(let fn of files) {
        console.log("Opening " + fn);
        const text = (await fsP.readFile(`./source/${fn}`, "utf8")).trim();
        const lang = fn.substring(0, 2).toLowerCase();

        process.stdout.write("Parsing");
        const laws = JSON.parse(text).Laws;
        let law, i = 0;
        while(law = laws.pop()) {
            const pcode = (law.LawURL || law.EngLawURL).slice(-8);
            const path = `${lang}/${pcode}.json`;

            // await fsP.writeFile(`./json_split/${path}`, JSON.stringify(law, null, "  "));
            const arranged = arrange(law);
            await fsP.writeFile(`./json_arrange/${path}`, JSON.stringify(arranged, null, "\t"));

            /// show tables
            const articles = (law.LawArticles || law.EngLawArticles);
            for(let i = 0; i < articles.length; ++i) {
                const article = articles[i];
                const text = (article.ArticleContent || article.EngArticleContent);
                const matches = [...text.matchAll(/[\u2500-\u257f]/g)];
                if(matches.length) {
                    // const an = (pcode, article.ArticleNo || article.EngArticleNo);
                    // console.log(pcode, an);
                    // await fh.write(`${pcode}\t${an}\r\n`);

                    // const last = matches[matches.length - 1];
                    // const table = text.substring(matches[0].index, last.index + last[0].length);
                    // // console.log(table); await new Promise(r => setTimeout(r, 1000));
                    // await fh.write(table + "\r\n\r\n");
                }
            }
            // if(++i === 50) break;
            if(!(++i % 50)) process.stdout.write(".");
        }
        process.stdout.write("\n");
    }
    // await fh.write("</pre>");
    // fh.close();
})();
