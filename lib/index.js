'use strict'

const Joi     = require('joi');
const Handler = require('./handler');

module.exports = function(opt={}){

    if (!this.path.static) throw this.error.type({
        name: 'bundler',
        type: 'this.path.static',
        data: this.path.static
    });

    if (!this.util.is(opt).object()) opt = {};
    if (!this.util.is(opt.index).string()) opt.index = 'index';
    if (!this.util.is(opt.ext).object()) opt.ext = {};

    if (!this.util.is(opt.route).string()) throw this.error.type({
        name: 'bundler.route',
        type: 'string',
        data: !opt.route? opt.route : opt.route.constructor.name
    });

    if (!this.util.is(opt.ext.target).string()) throw this.error.type({
        name: 'bundler.ext.target',
        type: 'string',
        data: !opt.ext.target? opt.ext.target : opt.ext.target.constructor.name
    });

    if (!this.util.is(opt.ext.source).string()) throw this.error.type({
        name: 'bundler.ext.source',
        type: 'string',
        data: !opt.ext.source? opt.ext.source : opt.ext.source.constructor.name
    })

    if (!this.util.is(opt.callback).function()) throw this.error.type({
        name: 'bundler.callback',
        type: 'function',
        data: !opt.callback? opt.callback : opt.callback.constructor.name
    });

    this.server.route({
        method  : 'GET',
        path    : `${opt.route}/${opt.ext.target}/{filename*}`,
        handler : Handler.bind(this, opt),
        config  : {
            validate: {
                params: {
                    filename: Joi
                        .string()
                        .min(opt.ext.target.length + 1)
                        .required()
                        .regex(new RegExp(`[^\.]+\.${opt.ext.target}`))
                }
            }
        },
    });
}
