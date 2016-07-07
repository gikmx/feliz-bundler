'use strict'

const PATH = require('path');
const Rx   = require('rxjs/Rx');

module.exports = function(opt, request, reply){

    // if there's a leading `~` a bundle file is being required
    // otherwise, look for the css file on static
    const param$ = Rx.Observable
        .of(PATH.normalize(request.params.filename))
        .map(param => {
            let result;
            if (param[0] === '~') result = {
                root: this.path.app.bundles,
                name: param.slice(1, -1 * (opt.ext.target.length+1)),
                type: 'bundle'
            };
            else result = {
                root: PATH.join(this.path.static, opt.ext.target),
                name: param,
                type: 'static'
            }
            result.path = PATH.join(result.root, result.name);
            result.util = this.util.rx.path(result.path);
            return result;
        });

    // Static params always point to existing files on static
    const static_param$ = param$
        .filter(param => param.type == 'static')

    // bundle params can point to directories, first try to resolve them
    const bundle_param$ = param$
        .filter(param => param.type == 'bundle')
        .mergeMap(param => param.util
            .isDir()
            .map(isdir => {
                if (!isdir) param.path += `.${opt.ext.source}`;
                else {
                    param.root = param.path;
                    param.path = PATH.join(param.path,`${opt.index}.${opt.ext.source}`);
                }
                param.util = this.util.rx.path(param.path);
                return param;
            }))

    const file$ = Rx.Observable
        .merge(static_param$, bundle_param$)
        .mergeMap(param => param.util
            .isFile()
            .mergeMap(isfile => {
                if (!isfile) {
                    const err = this.error('Not Found');
                    err.statusCode = 404;
                    throw err;
                }
                return param.util.read()
            })
            .map(body => {
                param.body = body;
                delete param.util
                return param;
            })
        );

    opt.callback.call(this, file$, request, reply, opt);

}
