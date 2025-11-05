const path = require("path");
const fs = require("fs");

class Template {
    
    constructor(test_dir) {
        this.test_dir = test_dir;
    }

    getCompiled(test, params, defaults=[]) {
        return this.getTemplate(test, params, defaults).compiled;
    }

    getTemplate(test, params, defaults=[]) {
        let testpath = path.resolve(this.test_dir, test + ".xmlt");
        let template = fs.readFileSync(testpath, "utf8");
        
        let compiled = template;

        // Compile template
        compiled.match(/{{\s*[\w\.]+\s*}}/g).map((e) => {
            let eKey = e.replace("{{", "").replace("}}", "");

            let eVal = null;

            let deafult_param = defaults.filter((p)=> { return (p.key==eKey) })[0];
            let param = params.filter((p)=> { return (p.key==eKey) })[0];

            eVal = (deafult_param!=null)? deafult_param.val : null;
            eVal = (param!=null)? param.val : eVal;

            if (eVal == null) eVal = "";
            
            compiled = compiled.replaceAll(e, eVal);

            // if params not yet contains param
            if(params.filter((p)=> {
                return (p.key == eKey);
            }).length == 0) {
                params.push({ "key": eKey, "val": eVal });
            }
        });
        
        return {
            test: test,
            params: params,
            defaults: defaults,
            compiled: compiled
        };
    };
}


module.exports = Template;