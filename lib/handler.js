'use strict'

const PATH = require('path');
const Rx   = require('rxjs/Rx');
const Boom = require('boom');

module.exports = function(opt, request, reply){

    const filename$ = Rx.Observable.of(PATH.normalize(request.params.filename))

    // Checks if the request specifies an actual static file and serves it.
    // otherwise, it just returns the filename;
    const static$ = filename$.mergeMap(filename => {
        const root = PATH.join(this.path.static, opt.ext.target);
        filename = PATH.join(root, filename);
        return this.util.rx.path(filename)
            .isReadable()
            .mergeMap(isReadable => {
                if (!isReadable) return filename$;
                reply.file(filename);
                return Rx.Observable.of(null);
            })
            .filter(Boolean)
    });

    // So, not an static file, this must be a request for a bundle instead, right?
    // if it isn't send a 404, if it is, returns an object with the bundle info.
    const exists$ = static$
        .mergeMap(filename => {
            if (filename[0] !== '~') throw 404;
            const bundle = filename.slice(1, -1 * (opt.ext.target.length + 1));
            const locations = [
                PATH.join(this.path.bundles, `${bundle}.${opt.ext.source}`),
                PATH.join(this.path.bundles, bundle, `${opt.index}.${opt.ext.source}`)
            ];
            return Rx.Observable
                .from(locations)
                .mergeMap(location => this.util.rx.path(location)
                    .isReadable()
                    .map(readable => !readable? null : {
                        root: this.path.bundles,
                        name: bundle,
                        path: location,
                        type: 'bundle'
                    })
                )
                .filter(Boolean)
                .toArray()
        })
        .map(found => {
            if (!found.length) throw 404;
            return found[0];
        })
        .catch(err => {
            if (err !== 404) throw err;
            reply(Boom.notFound());
            return Rx.Observable.of(null);
        })
        .filter(Boolean);

    // At this point we know the bundle exists and we got its full path,
    // Get the contents and construct and object with the info back to the client handler.
    let bundle$ = exists$.mergeMap(bundle => this.util.rx.path(bundle.path)
        .read()
        .map(body => {
            bundle.body = body;
            return bundle;
        })
    );

    opt.callback.call(this, bundle$, request, reply, opt);

}
