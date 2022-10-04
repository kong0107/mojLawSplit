const fsP = require("fs").promises;
const arrange = require("./lib/arrange");

(async() => {
    const files = (await fsP.readdir("./source")).filter(fn => fn.endsWith(".json"));
    // const files = (await fsP.readdir("./source")).filter(fn => fn.startsWith("Ch") && fn.endsWith(".json"));
    // const files = ["ChOrder.json"];
    for(let fn of files) {
        const lang = fn.substring(0, 2).toLowerCase();

        console.log("Opening " + fn);
        const text = (await fsP.readFile(`./source/${fn}`, "utf8")).trim();

        process.stdout.write("Parsing");
        const laws = JSON.parse(text).Laws;
        let law, i = 0;
        while(law = laws.pop()) {
            const pcode = (law.LawURL || law.EngLawURL).slice(-8);
            const path = `${lang}/${pcode}.json`;

            // await fsP.writeFile(`./json_split/${path}`, JSON.stringify(law, null, "  "));
            const arranged = arrange(law);
            await fsP.writeFile(`./json_arrange/${path}`, JSON.stringify(arranged, null, "\t"));

            if(!(++i % 50)) process.stdout.write(".");
        }
        process.stdout.write("\n");
    }

})();
