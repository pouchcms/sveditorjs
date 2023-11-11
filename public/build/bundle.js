
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var bundle$c = {exports: {}};

    (function (module, exports) {
    	!function(t,e){module.exports=e();}(window,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r});},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(r,o,function(e){return t[e]}.bind(null,o));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/",n(n.s=5)}([function(t,e,n){var r=n(1);"string"==typeof r&&(r=[[t.i,r,""]]);var o={hmr:!0,transform:void 0,insertInto:void 0};n(3)(r,o);r.locals&&(t.exports=r.locals);},function(t,e,n){(t.exports=n(2)(!1)).push([t.i,".inline-code {\n  background: rgba(250, 239, 240, 0.78);\n  color: #b44437;\n  padding: 3px 4px;\n  border-radius: 5px;\n  margin: 0 1px;\n  font-family: inherit;\n  font-size: 0.86em;\n  font-weight: 500;\n  letter-spacing: 0.3px;\n}\n",""]);},function(t,e){t.exports=function(t){var e=[];return e.toString=function(){return this.map(function(e){var n=function(t,e){var n=t[1]||"",r=t[3];if(!r)return n;if(e&&"function"==typeof btoa){var o=(s=r,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(s))))+" */"),i=r.sources.map(function(t){return "/*# sourceURL="+r.sourceRoot+t+" */"});return [n].concat(i).concat([o]).join("\n")}var s;return [n].join("\n")}(e,t);return e[2]?"@media "+e[2]+"{"+n+"}":n}).join("")},e.i=function(t,n){"string"==typeof t&&(t=[[null,t,""]]);for(var r={},o=0;o<this.length;o++){var i=this[o][0];"number"==typeof i&&(r[i]=!0);}for(o=0;o<t.length;o++){var s=t[o];"number"==typeof s[0]&&r[s[0]]||(n&&!s[2]?s[2]=n:n&&(s[2]="("+s[2]+") and ("+n+")"),e.push(s));}},e};},function(t,e,n){var r,o,i={},s=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),a=function(t){var e={};return function(t){if("function"==typeof t)return t();if(void 0===e[t]){var n=function(t){return document.querySelector(t)}.call(this,t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(t){n=null;}e[t]=n;}return e[t]}}(),u=null,c=0,f=[],l=n(4);function p(t,e){for(var n=0;n<t.length;n++){var r=t[n],o=i[r.id];if(o){o.refs++;for(var s=0;s<o.parts.length;s++)o.parts[s](r.parts[s]);for(;s<r.parts.length;s++)o.parts.push(g(r.parts[s],e));}else {var a=[];for(s=0;s<r.parts.length;s++)a.push(g(r.parts[s],e));i[r.id]={id:r.id,refs:1,parts:a};}}}function d(t,e){for(var n=[],r={},o=0;o<t.length;o++){var i=t[o],s=e.base?i[0]+e.base:i[0],a={css:i[1],media:i[2],sourceMap:i[3]};r[s]?r[s].parts.push(a):n.push(r[s]={id:s,parts:[a]});}return n}function h(t,e){var n=a(t.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=f[f.length-1];if("top"===t.insertAt)r?r.nextSibling?n.insertBefore(e,r.nextSibling):n.appendChild(e):n.insertBefore(e,n.firstChild),f.push(e);else if("bottom"===t.insertAt)n.appendChild(e);else {if("object"!=typeof t.insertAt||!t.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=a(t.insertInto+" "+t.insertAt.before);n.insertBefore(e,o);}}function v(t){if(null===t.parentNode)return !1;t.parentNode.removeChild(t);var e=f.indexOf(t);e>=0&&f.splice(e,1);}function b(t){var e=document.createElement("style");return void 0===t.attrs.type&&(t.attrs.type="text/css"),y(e,t.attrs),h(t,e),e}function y(t,e){Object.keys(e).forEach(function(n){t.setAttribute(n,e[n]);});}function g(t,e){var n,r,o,i;if(e.transform&&t.css){if(!(i=e.transform(t.css)))return function(){};t.css=i;}if(e.singleton){var s=c++;n=u||(u=b(e)),r=x.bind(null,n,s,!1),o=x.bind(null,n,s,!0);}else t.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(t){var e=document.createElement("link");return void 0===t.attrs.type&&(t.attrs.type="text/css"),t.attrs.rel="stylesheet",y(e,t.attrs),h(t,e),e}(e),r=function(t,e,n){var r=n.css,o=n.sourceMap,i=void 0===e.convertToAbsoluteUrls&&o;(e.convertToAbsoluteUrls||i)&&(r=l(r));o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var s=new Blob([r],{type:"text/css"}),a=t.href;t.href=URL.createObjectURL(s),a&&URL.revokeObjectURL(a);}.bind(null,n,e),o=function(){v(n),n.href&&URL.revokeObjectURL(n.href);}):(n=b(e),r=function(t,e){var n=e.css,r=e.media;r&&t.setAttribute("media",r);if(t.styleSheet)t.styleSheet.cssText=n;else {for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(n));}}.bind(null,n),o=function(){v(n);});return r(t),function(e){if(e){if(e.css===t.css&&e.media===t.media&&e.sourceMap===t.sourceMap)return;r(t=e);}else o();}}t.exports=function(t,e){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(e=e||{}).attrs="object"==typeof e.attrs?e.attrs:{},e.singleton||"boolean"==typeof e.singleton||(e.singleton=s()),e.insertInto||(e.insertInto="head"),e.insertAt||(e.insertAt="bottom");var n=d(t,e);return p(n,e),function(t){for(var r=[],o=0;o<n.length;o++){var s=n[o];(a=i[s.id]).refs--,r.push(a);}t&&p(d(t,e),e);for(o=0;o<r.length;o++){var a;if(0===(a=r[o]).refs){for(var u=0;u<a.parts.length;u++)a.parts[u]();delete i[a.id];}}}};var m,w=(m=[],function(t,e){return m[t]=e,m.filter(Boolean).join("\n")});function x(t,e,n,r){var o=n?"":r.css;if(t.styleSheet)t.styleSheet.cssText=w(e,o);else {var i=document.createTextNode(o),s=t.childNodes;s[e]&&t.removeChild(s[e]),s.length?t.insertBefore(i,s[e]):t.appendChild(i);}}},function(t,e){t.exports=function(t){var e="undefined"!=typeof window&&window.location;if(!e)throw new Error("fixUrls requires window.location");if(!t||"string"!=typeof t)return t;var n=e.protocol+"//"+e.host,r=n+e.pathname.replace(/\/[^\/]*$/,"/");return t.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,function(t,e){var o,i=e.trim().replace(/^"(.*)"$/,function(t,e){return e}).replace(/^'(.*)'$/,function(t,e){return e});return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(i)?t:(o=0===i.indexOf("//")?i:0===i.indexOf("/")?n+i:r+i.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")})};},function(t,e,n){n.r(e);n(0);function r(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r);}}function o(t,e,n){return e&&r(t.prototype,e),n&&r(t,n),t}n.d(e,"default",function(){return i});var i=function(){function t(e){var n=e.api;!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.api=n,this.button=null,this.tag="CODE",this.iconClasses={base:this.api.styles.inlineToolButton,active:this.api.styles.inlineToolButtonActive};}return o(t,null,[{key:"CSS",get:function(){return "inline-code"}}]),o(t,[{key:"render",value:function(){return this.button=document.createElement("button"),this.button.type="button",this.button.classList.add(this.iconClasses.base),this.button.innerHTML=this.toolboxIcon,this.button}},{key:"surround",value:function(e){if(e){var n=this.api.selection.findParentTag(this.tag,t.CSS);n?this.unwrap(n):this.wrap(e);}}},{key:"wrap",value:function(e){var n=document.createElement(this.tag);n.classList.add(t.CSS),n.appendChild(e.extractContents()),e.insertNode(n),this.api.selection.expandToTag(n);}},{key:"unwrap",value:function(t){this.api.selection.expandToTag(t);var e=window.getSelection(),n=e.getRangeAt(0),r=n.extractContents();t.parentNode.removeChild(t),n.insertNode(r),e.removeAllRanges(),e.addRange(n);}},{key:"checkState",value:function(){var e=this.api.selection.findParentTag(this.tag,t.CSS);this.button.classList.toggle(this.iconClasses.active,!!e);}},{key:"toolboxIcon",get:function(){return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9.5 8L6.11524 11.8683C6.04926 11.9437 6.04926 12.0563 6.11524 12.1317L9.5 16"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M15 8L18.3848 11.8683C18.4507 11.9437 18.4507 12.0563 18.3848 12.1317L15 16"/></svg>'}}],[{key:"isInline",get:function(){return !0}},{key:"sanitize",get:function(){return {code:{class:t.CSS}}}}]),t}();}]).default}); 
    } (bundle$c));

    var bundleExports$c = bundle$c.exports;
    var InlineCode = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$c);

    var bundle$b = {exports: {}};

    (function (module, exports) {
    	!function(t,o){module.exports=o();}(self,(()=>(()=>{var t={424:(t,o,e)=>{e.d(o,{Z:()=>a});var n=e(81),i=e.n(n),r=e(645),s=e.n(r)()(i());s.push([t.id,".tooltip-tool__input{\n  border: 0;\n  border-radius: 0 0 4px 4px;\n  border-top: 1px solid rgba(201,201,204,.48);\n}\n\n.tooltip-tool__span{\n  padding: 3px;\n  border-radius: 6px;\n}\n\n.tooltip-tool__underline{\n  text-decoration: underline;\n}\n\n.tooltip-color::before {\n  background-color: transparent;\n}\n\n.tooltip-color::after {\n  background-color: transparent;\n}\n\n.tooltip-text-color {\n  color: transparent;\n}\n\n.cdx-tooltip {\n  display: inline-block;\n}\n",""]);const a=s;},645:t=>{t.exports=function(t){var o=[];return o.toString=function(){return this.map((function(o){var e="",n=void 0!==o[5];return o[4]&&(e+="@supports (".concat(o[4],") {")),o[2]&&(e+="@media ".concat(o[2]," {")),n&&(e+="@layer".concat(o[5].length>0?" ".concat(o[5]):""," {")),e+=t(o),n&&(e+="}"),o[2]&&(e+="}"),o[4]&&(e+="}"),e})).join("")},o.i=function(t,e,n,i,r){"string"==typeof t&&(t=[[null,t,void 0]]);var s={};if(n)for(var a=0;a<this.length;a++){var l=this[a][0];null!=l&&(s[l]=!0);}for(var c=0;c<t.length;c++){var u=[].concat(t[c]);n&&s[u[0]]||(void 0!==r&&(void 0===u[5]||(u[1]="@layer".concat(u[5].length>0?" ".concat(u[5]):""," {").concat(u[1],"}")),u[5]=r),e&&(u[2]?(u[1]="@media ".concat(u[2]," {").concat(u[1],"}"),u[2]=e):u[2]=e),i&&(u[4]?(u[1]="@supports (".concat(u[4],") {").concat(u[1],"}"),u[4]=i):u[4]="".concat(i)),o.push(u));}},o};},81:t=>{t.exports=function(t){return t[1]};},379:t=>{var o=[];function e(t){for(var e=-1,n=0;n<o.length;n++)if(o[n].identifier===t){e=n;break}return e}function n(t,n){for(var r={},s=[],a=0;a<t.length;a++){var l=t[a],c=n.base?l[0]+n.base:l[0],u=r[c]||0,p="".concat(c," ").concat(u);r[c]=u+1;var d=e(p),h={css:l[1],media:l[2],sourceMap:l[3],supports:l[4],layer:l[5]};if(-1!==d)o[d].references++,o[d].updater(h);else {var f=i(h,n);n.byIndex=a,o.splice(a,0,{identifier:p,updater:f,references:1});}s.push(p);}return s}function i(t,o){var e=o.domAPI(o);return e.update(t),function(o){if(o){if(o.css===t.css&&o.media===t.media&&o.sourceMap===t.sourceMap&&o.supports===t.supports&&o.layer===t.layer)return;e.update(t=o);}else e.remove();}}t.exports=function(t,i){var r=n(t=t||[],i=i||{});return function(t){t=t||[];for(var s=0;s<r.length;s++){var a=e(r[s]);o[a].references--;}for(var l=n(t,i),c=0;c<r.length;c++){var u=e(r[c]);0===o[u].references&&(o[u].updater(),o.splice(u,1));}r=l;}};},569:t=>{var o={};t.exports=function(t,e){var n=function(t){if(void 0===o[t]){var e=document.querySelector(t);if(window.HTMLIFrameElement&&e instanceof window.HTMLIFrameElement)try{e=e.contentDocument.head;}catch(t){e=null;}o[t]=e;}return o[t]}(t);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");n.appendChild(e);};},216:t=>{t.exports=function(t){var o=document.createElement("style");return t.setAttributes(o,t.attributes),t.insert(o,t.options),o};},575:t=>{t.exports=function(t,o){Object.keys(o).forEach((function(e){t.setAttribute(e,o[e]);}));};},795:t=>{t.exports=function(t){var o=t.insertStyleElement(t);return {update:function(e){!function(t,o,e){var n="";e.supports&&(n+="@supports (".concat(e.supports,") {")),e.media&&(n+="@media ".concat(e.media," {"));var i=void 0!==e.layer;i&&(n+="@layer".concat(e.layer.length>0?" ".concat(e.layer):""," {")),n+=e.css,i&&(n+="}"),e.media&&(n+="}"),e.supports&&(n+="}");var r=e.sourceMap;r&&"undefined"!=typeof btoa&&(n+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(r))))," */")),o.styleTagTransform(n,t,o.options);}(o,t,e);},remove:function(){!function(t){if(null===t.parentNode)return !1;t.parentNode.removeChild(t);}(o);}}};},589:t=>{t.exports=function(t,o){if(o.styleSheet)o.styleSheet.cssText=t;else {for(;o.firstChild;)o.removeChild(o.firstChild);o.appendChild(document.createTextNode(t));}};},980:t=>{t.exports='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="14" viewBox="0 -5 21 30"><path fill="currentColor" stroke-width="0" d="M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H16L12,22L8,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H8.83L12,19.17L15.17,16H20V4H4M6,7H18V9H6V7M6,11H16V13H6V11Z"></path></svg>';}},o={};function e(n){var i=o[n];if(void 0!==i)return i.exports;var r=o[n]={id:n,exports:{}};return t[n](r,r.exports,e),r.exports}e.n=t=>{var o=t&&t.__esModule?()=>t.default:()=>t;return e.d(o,{a:o}),o},e.d=(t,o)=>{for(var n in o)e.o(o,n)&&!e.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:o[n]});},e.o=(t,o)=>Object.prototype.hasOwnProperty.call(t,o);var n={};return (()=>{e.d(n,{default:()=>m});var t=e(379),o=e.n(t),i=e(795),r=e.n(i),s=e(569),a=e.n(s),l=e(575),c=e.n(l),u=e(216),p=e.n(u),d=e(589),h=e.n(d),f=e(424),v={attributes:{id:"editorjs-tooltip"}};v.styleTagTransform=h(),v.setAttributes=c(),v.insert=a().bind(null,"head"),v.domAPI=r(),v.insertStyleElement=p(),o()(f.Z,v),f.Z&&f.Z.locals&&f.Z.locals;var y=e(980),b=e.n(y);function g(t,o){for(var e=0;e<o.length;e++){var n=o[e];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}var m=function(){function t(o){var e=o.api,n=o.config,i=void 0===n?{}:n;!function(t,o){if(!(t instanceof o))throw new TypeError("Cannot call a class as a function")}(this,t),this.api=e,this.button=null,this._state=!1,this.spanTooltip=null;var r=i.location,s=void 0===r?"bottom":r;this.tooltipLocation=s,this.highlightColor=i.highlightColor,this.underline=!!i.underline&&i.underline,this.backgroundColor=i.backgroundColor,this.textColor=i.textColor,this.editorId=i.holder?i.holder:"editorjs",this.tag="SPAN",this.CSS={input:"tooltip-tool__input",tooltip:"cdx-tooltip",span:"tooltip-tool__span",underline:"tooltip-tool__underline"},this.tooltipsObserver(),(this.backgroundColor||this.textColor)&&this.customTooltip();}var o,e,n;return o=t,e=[{key:"state",get:function(){return this._state},set:function(t){this._state=t;var o=this.button,e=this.api.styles.inlineToolButtonActive;o.classList.toggle(e,t);}},{key:"customTooltip",value:function(){var t=this,o=document.querySelector(".ct"),e=document.querySelector(".ct__content");new MutationObserver((function(n){n.forEach((function(n){if("childList"===n.type){var i=e.textContent;document.querySelector('[data-tooltip="'.concat(i,'"]'))?(t.backgroundColor&&t.setTooltipColor(),t.textColor&&t.setTooltipTextColor()):(o.classList.remove("tooltip-color"),e.classList.remove("tooltip-text-color"));}}));})).observe(e,{childList:!0});}},{key:"tooltipSheet",value:function(){var t=document.styleSheets;return Object.values(t).filter((function(t){return "editorjs-tooltip"===t.ownerNode.id}))}},{key:"tooltipCssRule",value:function(t){var o=this.tooltipSheet();return Object.values(o[0].cssRules).filter((function(o){return o.selectorText===t}))}},{key:"setTooltipColor",value:function(){var t=document.querySelector(".ct"),o=this.tooltipCssRule(".tooltip-color::before"),e=this.tooltipCssRule(".tooltip-color::after");o[0].style.setProperty("background-color",this.backgroundColor),e[0].style.setProperty("background-color",this.backgroundColor),t.classList.add("tooltip-color");}},{key:"setTooltipTextColor",value:function(){var t=this.tooltipCssRule(".tooltip-text-color"),o=document.querySelector(".ct__content");t[0].style.setProperty("color",this.textColor),o.classList.add("tooltip-text-color");}},{key:"tooltipsObserver",value:function(){var t=this,o=document.getElementById(this.editorId);new MutationObserver((function(o){o.forEach((function(o){"childList"===o.type&&o.target.classList.contains("codex-editor__redactor")&&document.querySelectorAll(".cdx-tooltip").forEach((function(o){return t.createTooltip(o.dataset.tooltip,o)}));}));})).observe(o,{childList:!0,subtree:!0});}},{key:"createTooltip",value:function(t){var o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:this.spanTooltip;this.spanTooltip?(this.spanTooltip.dataset.tooltip=t,this.setBackgroundColor(this.spanTooltip),this.setUnderlineDecoration(this.spanTooltip)):(this.setBackgroundColor(o),this.setUnderlineDecoration(o));var e=this.tooltipLocation;this.api.tooltip.onHover(o,t,{placement:e});}},{key:"setBackgroundColor",value:function(t){var o=t;o.childElementCount>0?(o.firstChild.classList.add(this.CSS.span),o.firstChild.style.background=this.highlightColor):(o.classList.add(this.CSS.span),o.style.background=this.highlightColor);}},{key:"setUnderlineDecoration",value:function(t){var o=t;this.underline&&(o.childElementCount>0?o.firstChild.classList.add(this.CSS.underline):o.classList.add(this.CSS.underline));}},{key:"render",value:function(){this.button=document.createElement("button"),this.button.type="button",this.button.innerHTML=b();var t=this.api.styles.inlineToolButton;return this.button.classList.add(t),this.button}},{key:"surround",value:function(t){this.state?this.unwrap(t):this.wrap(t);}},{key:"wrap",value:function(t){var o=t.extractContents();this.spanTooltip=document.createElement(this.tag),this.spanTooltip.classList.add(this.CSS.tooltip),this.spanTooltip.appendChild(o),t.insertNode(this.spanTooltip),this.api.selection.expandToTag(this.spanTooltip);}},{key:"unwrap",value:function(t){this.spanTooltip=this.api.selection.findParentTag(this.tag,this.CSS.tooltip);var o=t.extractContents();this.spanTooltip.remove(),t.insertNode(o);}},{key:"checkState",value:function(){this.spanTooltip=this.api.selection.findParentTag(this.tag),this.state=!!this.spanTooltip,this.state?this.showActions():this.hideActions();}},{key:"renderActions",value:function(){if(this.spanTooltip=this.api.selection.findParentTag(this.tag),this.tooltipInput=document.createElement("input"),this.tooltipInput.placeholder="Add a tooltip",this.tooltipInput.classList.add(this.api.styles.input),this.tooltipInput.classList.add(this.CSS.input),this.spanTooltip){var t=this.spanTooltip.dataset.tooltip;this.tooltipInput.value=t;}return this.tooltipInput.hidden=!0,this.tooltipInput}},{key:"showActions",value:function(){var t=this;this.tooltipInput.hidden=!1,this.api.listeners.on(this.tooltipInput,"keydown",(function(o){if("Enter"===o.key){var e=t.tooltipInput.value;t.createTooltip(e),t.closeToolbar();}}),!1);}},{key:"hideActions",value:function(){this.tooltipInput.hidden=!0;}},{key:"closeToolbar",value:function(){document.querySelector(".ce-inline-toolbar--showed").classList.remove("ce-inline-toolbar--showed");}}],n=[{key:"isInline",get:function(){return !0}},{key:"sanitize",get:function(){return {span:function(t){return t.classList.remove("tooltip-tool__span","tooltip-tool__underline"),{class:!0,"data-tooltip":!0}}}}}],e&&g(o.prototype,e),n&&g(o,n),Object.defineProperty(o,"prototype",{writable:!1}),t}();})(),n.default})())); 
    } (bundle$b));

    var bundleExports$b = bundle$b.exports;
    var Tooltip = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$b);

    var bundle$a = {exports: {}};

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,(function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=4)}([function(e,t,n){var r=n(1),o=n(2);"string"==typeof(o=o.__esModule?o.default:o)&&(o=[[e.i,o,""]]);var i={insert:"head",singleton:!1};r(o,i);e.exports=o.locals||{};},function(e,t,n){var r,o=function(){return void 0===r&&(r=Boolean(window&&document&&document.all&&!window.atob)),r},i=function(){var e={};return function(t){if(void 0===e[t]){var n=document.querySelector(t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(e){n=null;}e[t]=n;}return e[t]}}(),a=[];function u(e){for(var t=-1,n=0;n<a.length;n++)if(a[n].identifier===e){t=n;break}return t}function c(e,t){for(var n={},r=[],o=0;o<e.length;o++){var i=e[o],c=t.base?i[0]+t.base:i[0],s=n[c]||0,l="".concat(c," ").concat(s);n[c]=s+1;var f=u(l),d={css:i[1],media:i[2],sourceMap:i[3]};-1!==f?(a[f].references++,a[f].updater(d)):a.push({identifier:l,updater:b(d,t),references:1}),r.push(l);}return r}function s(e){var t=document.createElement("style"),r=e.attributes||{};if(void 0===r.nonce){var o=n.nc;o&&(r.nonce=o);}if(Object.keys(r).forEach((function(e){t.setAttribute(e,r[e]);})),"function"==typeof e.insert)e.insert(t);else {var a=i(e.insert||"head");if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(t);}return t}var l,f=(l=[],function(e,t){return l[e]=t,l.filter(Boolean).join("\n")});function d(e,t,n,r){var o=n?"":r.media?"@media ".concat(r.media," {").concat(r.css,"}"):r.css;if(e.styleSheet)e.styleSheet.cssText=f(t,o);else {var i=document.createTextNode(o),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(i,a[t]):e.appendChild(i);}}function p(e,t,n){var r=n.css,o=n.media,i=n.sourceMap;if(o?e.setAttribute("media",o):e.removeAttribute("media"),i&&"undefined"!=typeof btoa&&(r+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(i))))," */")),e.styleSheet)e.styleSheet.cssText=r;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(r));}}var v=null,h=0;function b(e,t){var n,r,o;if(t.singleton){var i=h++;n=v||(v=s(t)),r=d.bind(null,n,i,!1),o=d.bind(null,n,i,!0);}else n=s(t),r=p.bind(null,n,t),o=function(){!function(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);}(n);};return r(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;r(e=t);}else o();}}e.exports=function(e,t){(t=t||{}).singleton||"boolean"==typeof t.singleton||(t.singleton=o());var n=c(e=e||[],t);return function(e){if(e=e||[],"[object Array]"===Object.prototype.toString.call(e)){for(var r=0;r<n.length;r++){var o=u(n[r]);a[o].references--;}for(var i=c(e,t),s=0;s<n.length;s++){var l=u(n[s]);0===a[l].references&&(a[l].updater(),a.splice(l,1));}n=i;}}};},function(e,t,n){(t=n(3)(!1)).push([e.i,".cdx-underline {\n    text-decoration: underline;\n}\n",""]),e.exports=t;},function(e,t,n){e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=function(e,t){var n=e[1]||"",r=e[3];if(!r)return n;if(t&&"function"==typeof btoa){var o=(a=r,u=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),c="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(u),"/*# ".concat(c," */")),i=r.sources.map((function(e){return "/*# sourceURL=".concat(r.sourceRoot||"").concat(e," */")}));return [n].concat(i).concat([o]).join("\n")}var a,u,c;return [n].join("\n")}(t,e);return t[2]?"@media ".concat(t[2]," {").concat(n,"}"):n})).join("")},t.i=function(e,n,r){"string"==typeof e&&(e=[[null,e,""]]);var o={};if(r)for(var i=0;i<this.length;i++){var a=this[i][0];null!=a&&(o[a]=!0);}for(var u=0;u<e.length;u++){var c=[].concat(e[u]);r&&o[c[0]]||(n&&(c[2]?c[2]="".concat(n," and ").concat(c[2]):c[2]=n),t.push(c));}},t};},function(e,t,n){n.r(t),n.d(t,"default",(function(){return i}));n(0);function r(e){return (r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,(i=o.key,a=void 0,a=function(e,t){if("object"!==r(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var o=n.call(e,t||"default");if("object"!==r(o))return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return ("string"===t?String:Number)(e)}(i,"string"),"symbol"===r(a)?a:String(a)),o);}var i,a;}var i=function(){function e(t){var n=t.api;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.api=n,this.button=null,this.tag="U",this.iconClasses={base:this.api.styles.inlineToolButton,active:this.api.styles.inlineToolButtonActive};}var t,n,r;return t=e,r=[{key:"CSS",get:function(){return "cdx-underline"}},{key:"isInline",get:function(){return !0}},{key:"sanitize",get:function(){return {u:{class:e.CSS}}}}],(n=[{key:"render",value:function(){return this.button=document.createElement("button"),this.button.type="button",this.button.classList.add(this.iconClasses.base),this.button.innerHTML=this.toolboxIcon,this.button}},{key:"surround",value:function(t){if(t){var n=this.api.selection.findParentTag(this.tag,e.CSS);n?this.unwrap(n):this.wrap(t);}}},{key:"wrap",value:function(t){var n=document.createElement(this.tag);n.classList.add(e.CSS),n.appendChild(t.extractContents()),t.insertNode(n),this.api.selection.expandToTag(n);}},{key:"unwrap",value:function(e){this.api.selection.expandToTag(e);var t=window.getSelection(),n=t.getRangeAt(0),r=n.extractContents();e.parentNode.removeChild(e),n.insertNode(r),t.removeAllRanges(),t.addRange(n);}},{key:"checkState",value:function(){var t=this.api.selection.findParentTag(this.tag,e.CSS);this.button.classList.toggle(this.iconClasses.active,!!t);}},{key:"toolboxIcon",get:function(){return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7.5V11.5C9 12.2956 9.31607 13.0587 9.87868 13.6213C10.4413 14.1839 11.2044 14.5 12 14.5C12.7956 14.5 13.5587 14.1839 14.1213 13.6213C14.6839 13.0587 15 12.2956 15 11.5V7.5"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.71429 18H16.2857"/></svg>'}}])&&o(t.prototype,n),r&&o(t,r),Object.defineProperty(t,"prototype",{writable:!1}),e}();}]).default})); 
    } (bundle$a));

    var bundleExports$a = bundle$a.exports;
    var Underline = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$a);

    var bundle$9 = {exports: {}};

    (function (module, exports) {
    	!function(t,e){module.exports=e();}(window,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r});},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(r,o,function(e){return t[e]}.bind(null,o));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/",n(n.s=5)}([function(t,e,n){var r=n(1);"string"==typeof r&&(r=[[t.i,r,""]]);var o={hmr:!0,transform:void 0,insertInto:void 0};n(3)(r,o);r.locals&&(t.exports=r.locals);},function(t,e,n){(t.exports=n(2)(!1)).push([t.i,".cdx-marker {\n  background: rgba(245,235,111,0.29);\n  padding: 3px 0;\n}",""]);},function(t,e){t.exports=function(t){var e=[];return e.toString=function(){return this.map(function(e){var n=function(t,e){var n=t[1]||"",r=t[3];if(!r)return n;if(e&&"function"==typeof btoa){var o=(a=r,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(a))))+" */"),i=r.sources.map(function(t){return "/*# sourceURL="+r.sourceRoot+t+" */"});return [n].concat(i).concat([o]).join("\n")}var a;return [n].join("\n")}(e,t);return e[2]?"@media "+e[2]+"{"+n+"}":n}).join("")},e.i=function(t,n){"string"==typeof t&&(t=[[null,t,""]]);for(var r={},o=0;o<this.length;o++){var i=this[o][0];"number"==typeof i&&(r[i]=!0);}for(o=0;o<t.length;o++){var a=t[o];"number"==typeof a[0]&&r[a[0]]||(n&&!a[2]?a[2]=n:n&&(a[2]="("+a[2]+") and ("+n+")"),e.push(a));}},e};},function(t,e,n){var r,o,i={},a=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),s=function(t){var e={};return function(t){if("function"==typeof t)return t();if(void 0===e[t]){var n=function(t){return document.querySelector(t)}.call(this,t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(t){n=null;}e[t]=n;}return e[t]}}(),u=null,c=0,f=[],l=n(4);function p(t,e){for(var n=0;n<t.length;n++){var r=t[n],o=i[r.id];if(o){o.refs++;for(var a=0;a<o.parts.length;a++)o.parts[a](r.parts[a]);for(;a<r.parts.length;a++)o.parts.push(g(r.parts[a],e));}else {var s=[];for(a=0;a<r.parts.length;a++)s.push(g(r.parts[a],e));i[r.id]={id:r.id,refs:1,parts:s};}}}function d(t,e){for(var n=[],r={},o=0;o<t.length;o++){var i=t[o],a=e.base?i[0]+e.base:i[0],s={css:i[1],media:i[2],sourceMap:i[3]};r[a]?r[a].parts.push(s):n.push(r[a]={id:a,parts:[s]});}return n}function h(t,e){var n=s(t.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=f[f.length-1];if("top"===t.insertAt)r?r.nextSibling?n.insertBefore(e,r.nextSibling):n.appendChild(e):n.insertBefore(e,n.firstChild),f.push(e);else if("bottom"===t.insertAt)n.appendChild(e);else {if("object"!=typeof t.insertAt||!t.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=s(t.insertInto+" "+t.insertAt.before);n.insertBefore(e,o);}}function v(t){if(null===t.parentNode)return !1;t.parentNode.removeChild(t);var e=f.indexOf(t);e>=0&&f.splice(e,1);}function b(t){var e=document.createElement("style");return void 0===t.attrs.type&&(t.attrs.type="text/css"),y(e,t.attrs),h(t,e),e}function y(t,e){Object.keys(e).forEach(function(n){t.setAttribute(n,e[n]);});}function g(t,e){var n,r,o,i;if(e.transform&&t.css){if(!(i=e.transform(t.css)))return function(){};t.css=i;}if(e.singleton){var a=c++;n=u||(u=b(e)),r=x.bind(null,n,a,!1),o=x.bind(null,n,a,!0);}else t.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(t){var e=document.createElement("link");return void 0===t.attrs.type&&(t.attrs.type="text/css"),t.attrs.rel="stylesheet",y(e,t.attrs),h(t,e),e}(e),r=function(t,e,n){var r=n.css,o=n.sourceMap,i=void 0===e.convertToAbsoluteUrls&&o;(e.convertToAbsoluteUrls||i)&&(r=l(r));o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var a=new Blob([r],{type:"text/css"}),s=t.href;t.href=URL.createObjectURL(a),s&&URL.revokeObjectURL(s);}.bind(null,n,e),o=function(){v(n),n.href&&URL.revokeObjectURL(n.href);}):(n=b(e),r=function(t,e){var n=e.css,r=e.media;r&&t.setAttribute("media",r);if(t.styleSheet)t.styleSheet.cssText=n;else {for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(n));}}.bind(null,n),o=function(){v(n);});return r(t),function(e){if(e){if(e.css===t.css&&e.media===t.media&&e.sourceMap===t.sourceMap)return;r(t=e);}else o();}}t.exports=function(t,e){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(e=e||{}).attrs="object"==typeof e.attrs?e.attrs:{},e.singleton||"boolean"==typeof e.singleton||(e.singleton=a()),e.insertInto||(e.insertInto="head"),e.insertAt||(e.insertAt="bottom");var n=d(t,e);return p(n,e),function(t){for(var r=[],o=0;o<n.length;o++){var a=n[o];(s=i[a.id]).refs--,r.push(s);}t&&p(d(t,e),e);for(o=0;o<r.length;o++){var s;if(0===(s=r[o]).refs){for(var u=0;u<s.parts.length;u++)s.parts[u]();delete i[s.id];}}}};var m,w=(m=[],function(t,e){return m[t]=e,m.filter(Boolean).join("\n")});function x(t,e,n,r){var o=n?"":r.css;if(t.styleSheet)t.styleSheet.cssText=w(e,o);else {var i=document.createTextNode(o),a=t.childNodes;a[e]&&t.removeChild(a[e]),a.length?t.insertBefore(i,a[e]):t.appendChild(i);}}},function(t,e){t.exports=function(t){var e="undefined"!=typeof window&&window.location;if(!e)throw new Error("fixUrls requires window.location");if(!t||"string"!=typeof t)return t;var n=e.protocol+"//"+e.host,r=n+e.pathname.replace(/\/[^\/]*$/,"/");return t.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,function(t,e){var o,i=e.trim().replace(/^"(.*)"$/,function(t,e){return e}).replace(/^'(.*)'$/,function(t,e){return e});return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(i)?t:(o=0===i.indexOf("//")?i:0===i.indexOf("/")?n+i:r+i.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")})};},function(t,e,n){n.r(e);n(0);function r(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r);}}function o(t,e,n){return e&&r(t.prototype,e),n&&r(t,n),t}n.d(e,"default",function(){return i});var i=function(){function t(e){var n=e.api;!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.api=n,this.button=null,this.tag="MARK",this.iconClasses={base:this.api.styles.inlineToolButton,active:this.api.styles.inlineToolButtonActive};}return o(t,null,[{key:"CSS",get:function(){return "cdx-marker"}}]),o(t,[{key:"render",value:function(){return this.button=document.createElement("button"),this.button.type="button",this.button.classList.add(this.iconClasses.base),this.button.innerHTML=this.toolboxIcon,this.button}},{key:"surround",value:function(e){if(e){var n=this.api.selection.findParentTag(this.tag,t.CSS);n?this.unwrap(n):this.wrap(e);}}},{key:"wrap",value:function(e){var n=document.createElement(this.tag);n.classList.add(t.CSS),n.appendChild(e.extractContents()),e.insertNode(n),this.api.selection.expandToTag(n);}},{key:"unwrap",value:function(t){this.api.selection.expandToTag(t);var e=window.getSelection(),n=e.getRangeAt(0),r=n.extractContents();t.parentNode.removeChild(t),n.insertNode(r),e.removeAllRanges(),e.addRange(n);}},{key:"checkState",value:function(){var e=this.api.selection.findParentTag(this.tag,t.CSS);this.button.classList.toggle(this.iconClasses.active,!!e);}},{key:"toolboxIcon",get:function(){return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" d="M11.3536 9.31802L12.7678 7.90381C13.5488 7.12276 14.8151 7.12276 15.5962 7.90381C16.3772 8.68486 16.3772 9.95119 15.5962 10.7322L14.182 12.1464M11.3536 9.31802L7.96729 12.7043C7.40889 13.2627 7.02827 13.9739 6.8734 14.7482L6.69798 15.6253C6.55804 16.325 7.17496 16.942 7.87468 16.802L8.75176 16.6266C9.52612 16.4717 10.2373 16.0911 10.7957 15.5327L14.182 12.1464M11.3536 9.31802L14.182 12.1464"/><line x1="15" x2="19" y1="17" y2="17" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>'}}],[{key:"isInline",get:function(){return !0}},{key:"sanitize",get:function(){return {mark:{class:t.CSS}}}}]),t}();}]).default}); 
    } (bundle$9));

    var bundleExports$9 = bundle$9.exports;
    var Marker = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$9);

    var bundle$8 = {exports: {}};

    (function (module, exports) {
    	!function(e,l){module.exports=l();}(window,(function(){return function(e){var l={};function a(_){if(l[_])return l[_].exports;var t=l[_]={i:_,l:!1,exports:{}};return e[_].call(t.exports,t,t.exports,a),t.l=!0,t.exports}return a.m=e,a.c=l,a.d=function(e,l,_){a.o(e,l)||Object.defineProperty(e,l,{enumerable:!0,get:_});},a.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},a.t=function(e,l){if(1&l&&(e=a(e)),8&l)return e;if(4&l&&"object"==typeof e&&e&&e.__esModule)return e;var _=Object.create(null);if(a.r(_),Object.defineProperty(_,"default",{enumerable:!0,value:e}),2&l&&"string"!=typeof e)for(var t in e)a.d(_,t,function(l){return e[l]}.bind(null,t));return _},a.n=function(e){var l=e&&e.__esModule?function(){return e.default}:function(){return e};return a.d(l,"a",l),l},a.o=function(e,l){return Object.prototype.hasOwnProperty.call(e,l)},a.p="",a(a.s=2)}([function(e,l){e.exports=function(e){var l=[];return l.toString=function(){return this.map((function(l){var a=function(e,l){var a=e[1]||"",_=e[3];if(!_)return a;if(l&&"function"==typeof btoa){var t=(o=_,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */"),r=_.sources.map((function(e){return "/*# sourceURL="+_.sourceRoot+e+" */"}));return [a].concat(r).concat([t]).join("\n")}var o;return [a].join("\n")}(l,e);return l[2]?"@media "+l[2]+"{"+a+"}":a})).join("")},l.i=function(e,a){"string"==typeof e&&(e=[[null,e,""]]);for(var _={},t=0;t<this.length;t++){var r=this[t][0];"number"==typeof r&&(_[r]=!0);}for(t=0;t<e.length;t++){var o=e[t];"number"==typeof o[0]&&_[o[0]]||(a&&!o[2]?o[2]=a:a&&(o[2]="("+o[2]+") and ("+a+")"),l.push(o));}},l};},function(e,l,a){var _,t,r={},o=(_=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===t&&(t=_.apply(this,arguments)),t}),s=function(e,l){return l?l.querySelector(e):document.querySelector(e)},c=function(e){var l={};return function(e,a){if("function"==typeof e)return e();if(void 0===l[e]){var _=s.call(this,e,a);if(window.HTMLIFrameElement&&_ instanceof window.HTMLIFrameElement)try{_=_.contentDocument.head;}catch(e){_=null;}l[e]=_;}return l[e]}}(),d=null,h=0,n=[],i=a(5);function v(e,l){for(var a=0;a<e.length;a++){var _=e[a],t=r[_.id];if(t){t.refs++;for(var o=0;o<t.parts.length;o++)t.parts[o](_.parts[o]);for(;o<_.parts.length;o++)t.parts.push(b(_.parts[o],l));}else {var s=[];for(o=0;o<_.parts.length;o++)s.push(b(_.parts[o],l));r[_.id]={id:_.id,refs:1,parts:s};}}}function w(e,l){for(var a=[],_={},t=0;t<e.length;t++){var r=e[t],o=l.base?r[0]+l.base:r[0],s={css:r[1],media:r[2],sourceMap:r[3]};_[o]?_[o].parts.push(s):a.push(_[o]={id:o,parts:[s]});}return a}function C(e,l){var a=c(e.insertInto);if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var _=n[n.length-1];if("top"===e.insertAt)_?_.nextSibling?a.insertBefore(l,_.nextSibling):a.appendChild(l):a.insertBefore(l,a.firstChild),n.push(l);else if("bottom"===e.insertAt)a.appendChild(l);else {if("object"!=typeof e.insertAt||!e.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var t=c(e.insertAt.before,a);a.insertBefore(l,t);}}function u(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);var l=n.indexOf(e);l>=0&&n.splice(l,1);}function f(e){var l=document.createElement("style");if(void 0===e.attrs.type&&(e.attrs.type="text/css"),void 0===e.attrs.nonce){var _=function(){return a.nc}();_&&(e.attrs.nonce=_);}return p(l,e.attrs),C(e,l),l}function p(e,l){Object.keys(l).forEach((function(a){e.setAttribute(a,l[a]);}));}function b(e,l){var a,_,t,r;if(l.transform&&e.css){if(!(r="function"==typeof l.transform?l.transform(e.css):l.transform.default(e.css)))return function(){};e.css=r;}if(l.singleton){var o=h++;a=d||(d=f(l)),_=y.bind(null,a,o,!1),t=y.bind(null,a,o,!0);}else e.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(a=function(e){var l=document.createElement("link");return void 0===e.attrs.type&&(e.attrs.type="text/css"),e.attrs.rel="stylesheet",p(l,e.attrs),C(e,l),l}(l),_=M.bind(null,a,l),t=function(){u(a),a.href&&URL.revokeObjectURL(a.href);}):(a=f(l),_=x.bind(null,a),t=function(){u(a);});return _(e),function(l){if(l){if(l.css===e.css&&l.media===e.media&&l.sourceMap===e.sourceMap)return;_(e=l);}else t();}}e.exports=function(e,l){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(l=l||{}).attrs="object"==typeof l.attrs?l.attrs:{},l.singleton||"boolean"==typeof l.singleton||(l.singleton=o()),l.insertInto||(l.insertInto="head"),l.insertAt||(l.insertAt="bottom");var a=w(e,l);return v(a,l),function(e){for(var _=[],t=0;t<a.length;t++){var o=a[t];(s=r[o.id]).refs--,_.push(s);}e&&v(w(e,l),l);for(t=0;t<_.length;t++){var s;if(0===(s=_[t]).refs){for(var c=0;c<s.parts.length;c++)s.parts[c]();delete r[s.id];}}}};var m,g=(m=[],function(e,l){return m[e]=l,m.filter(Boolean).join("\n")});function y(e,l,a,_){var t=a?"":_.css;if(e.styleSheet)e.styleSheet.cssText=g(l,t);else {var r=document.createTextNode(t),o=e.childNodes;o[l]&&e.removeChild(o[l]),o.length?e.insertBefore(r,o[l]):e.appendChild(r);}}function x(e,l){var a=l.css,_=l.media;if(_&&e.setAttribute("media",_),e.styleSheet)e.styleSheet.cssText=a;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(a));}}function M(e,l,a){var _=a.css,t=a.sourceMap,r=void 0===l.convertToAbsoluteUrls&&t;(l.convertToAbsoluteUrls||r)&&(_=i(_)),t&&(_+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(t))))+" */");var o=new Blob([_],{type:"text/css"}),s=e.href;e.href=URL.createObjectURL(o),s&&URL.revokeObjectURL(s);}},function(e,l,a){const{TableConstructor:_}=a(15),t={Toolbox:a(8),InsertColBefore:a(9),InsertColAfter:a(10),InsertRowBefore:a(11),InsertRowAfter:a(12),DeleteRow:a(13),DeleteCol:a(14)},r="tc-table__inp";e.exports=class{static get enableLineBreaks(){return !0}static get toolbox(){return {icon:t.Toolbox,title:"Table"}}constructor({data:e,config:l,api:a}){this.api=a,this.wrapper=void 0,this.config=l,this.data=e,this._tableConstructor=new _(e,l,a),this.actions=[{actionName:"InsertColBefore",icon:t.InsertColBefore,label:"Insert column before"},{actionName:"InsertColAfter",icon:t.InsertColAfter,label:"Insert column after"},{actionName:"InsertRowBefore",icon:t.InsertRowBefore,label:"Insert row before"},{actionName:"InsertRowAfter",icon:t.InsertRowAfter,label:"Insert row after"},{actionName:"DeleteRow",icon:t.DeleteRow,label:"Delete row"},{actionName:"DeleteCol",icon:t.DeleteCol,label:"Delete column"}];}performAction(e){switch(e){case"InsertColBefore":this._tableConstructor.table.insertColumnBefore();break;case"InsertColAfter":this._tableConstructor.table.insertColumnAfter();break;case"InsertRowBefore":this._tableConstructor.table.insertRowBefore();break;case"InsertRowAfter":this._tableConstructor.table.insertRowAfter();break;case"DeleteRow":this._tableConstructor.table.deleteRow();break;case"DeleteCol":this._tableConstructor.table.deleteColumn();}}renderSettings(){const e=document.createElement("div");return this.actions.forEach(({actionName:l,label:a,icon:_})=>{const t=this.api.i18n.t(a),r=document.createElement("div");r.classList.add("cdx-settings-button"),r.innerHTML=_,r.title=l,this.api.tooltip.onHover(r,t,{placement:"top"}),r.addEventListener("click",this.performAction.bind(this,l)),e.appendChild(r),this._tableConstructor.table.selectedCell&&this._tableConstructor.table.focusCellOnSelectedCell();}),e}render(){if(this.wrapper=document.createElement("div"),this.data&&this.data.content)this._createTableConfiguration();else {this.wrapper.classList.add("table-selector"),this.wrapper.setAttribute("data-hoveredClass","m,n");const e=6;this.createCells(e),"table-selector"===this.wrapper.className&&this.wrapper.addEventListener("mouseover",e=>{if(e.target.id.length){const l=e.target.attributes.row.value,a=e.target.attributes.column.value;this.wrapper.setAttribute("data-hoveredClass",`${l},${a}`);}}),this.wrapper.addEventListener("click",e=>{if(e.target.id.length){const l=e.target.attributes.row.value,a=e.target.attributes.column.value;this.wrapper.removeEventListener("mouseover",()=>{}),this.config.rows=l,this.config.cols=a,this._createTableConfiguration();}});}return this.wrapper}createCells(e){if(0!==e)for(let l=0;l<e;l++){let a=document.createElement("div");a.setAttribute("class","table-row");for(let _=0;_<e;_++){let e=document.createElement("div"),t=document.createElement("div");e.setAttribute("class","table-cell-container"),t.setAttribute("class","table-cell"),e.setAttribute("id",`row_${l+1}_cell_${_+1}`),e.setAttribute("column",_+1),e.setAttribute("row",l+1),t.setAttribute("id","cell_"+(_+1)),t.setAttribute("column",_+1),t.setAttribute("row",l+1),e.appendChild(t),a.appendChild(e);}this.wrapper.appendChild(a);}const l=document.createElement("input");l.classList.add("hidden-element"),l.setAttribute("tabindex",0),this.wrapper.appendChild(l);}_createTableConfiguration(){this.wrapper.innerHTML="",this._tableConstructor=new _(this.data,this.config,this.api),this.wrapper.appendChild(this._tableConstructor.htmlElement);}save(e){const l=e.querySelector("table"),a=[],_=l?l.rows:0;if(_.length){for(let e=0;e<_.length;e++){const l=_[e],t=Array.from(l.cells).map(e=>e.querySelector("."+r));t.every(this._isEmpty)||a.push(t.map(e=>e.innerHTML));}return {content:a}}}_isEmpty(e){return !e.textContent.trim()}static get pasteConfig(){return {tags:["TABLE","TR","TD","TBODY","TH"]}}async onPaste(e){const l=e.detail.data;this.data=this.pasteHandler(l),this._createTableConfiguration();}pasteHandler(e){const{tagName:l}=e,a={content:[],config:{rows:0,cols:0}};if("TABLE"===l){let l=Array.from(e.childNodes);l=l.find(e=>"TBODY"===e.nodeName);let _=Array.from(l.childNodes);_=[_].map(e=>e.filter(e=>"TR"===e.nodeName)),a.config.rows=_[0].length,a.content=_[0].map(e=>{let l=e.childNodes;return a.config.cols=l.length,l=[...l].map(e=>e.innerHTML),l});}return a}};},function(e,l,a){var _=a(4);"string"==typeof _&&(_=[[e.i,_,""]]);var t={hmr:!0,transform:void 0,insertInto:void 0};a(1)(_,t);_.locals&&(e.exports=_.locals);},function(e,l,a){(e.exports=a(0)(!1)).push([e.i,".tc-editor{padding:10px;position:relative;box-sizing:content-box;width:100%;left:-10px}",""]);},function(e,l){e.exports=function(e){var l="undefined"!=typeof window&&window.location;if(!l)throw new Error("fixUrls requires window.location");if(!e||"string"!=typeof e)return e;var a=l.protocol+"//"+l.host,_=a+l.pathname.replace(/\/[^\/]*$/,"/");return e.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,(function(e,l){var t,r=l.trim().replace(/^"(.*)"$/,(function(e,l){return l})).replace(/^'(.*)'$/,(function(e,l){return l}));return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(r)?e:(t=0===r.indexOf("//")?r:0===r.indexOf("/")?a+r:_+r.replace(/^\.\//,""),"url("+JSON.stringify(t)+")")}))};},function(e,l,a){var _=a(7);"string"==typeof _&&(_=[[e.i,_,""]]);var t={hmr:!0,transform:void 0,insertInto:void 0};a(1)(_,t);_.locals&&(e.exports=_.locals);},function(e,l,a){(e.exports=a(0)(!1)).push([e.i,'.tc-table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed;}.tc-table__wrap{border:1px solid #dbdbe2;border-radius:3px;position:relative;height:100%;width:100%;box-sizing:border-box}.tc-table__cell{border:1px solid #dbdbe2;padding:0;vertical-align:top}.tc-table__area{padding:10px;height:100%}.tc-table__inp{outline:none;flex-grow:100;min-height:1.5em;height:100%;overflow:hidden}.tc-table__highlight:focus-within{background-color:rgba(173,164,176,.1)}.tc-table tbody tr:first-child td{border-top:none}.tc-table tbody tr:last-child td{border-bottom:none}.tc-table tbody tr td:last-child{border-right:none}.tc-table tbody tr td:first-child{border-left:none}.table-selector{display:flex;flex-direction:column;}.table-selector .hidden-element{display:none}.table-row{display:flex;flex-direction:row}.table-cell-container{width:30px;height:30px}.table-cell{width:25px;height:25px;background:#f6f6f6;border:1px solid #e4e4e4;cursor:pointer}[data-hoveredClass="1,1"] #row_1_cell_1 #cell_1,[data-hoveredClass="1,2"] #row_1_cell_1 #cell_1,[data-hoveredClass="1,2"] #row_1_cell_2 #cell_2,[data-hoveredClass="1,3"] #row_1_cell_1 #cell_1,[data-hoveredClass="1,3"] #row_1_cell_2 #cell_2,[data-hoveredClass="1,3"] #row_1_cell_3 #cell_3,[data-hoveredClass="1,4"] #row_1_cell_1 #cell_1,[data-hoveredClass="1,4"] #row_1_cell_2 #cell_2,[data-hoveredClass="1,4"] #row_1_cell_3 #cell_3,[data-hoveredClass="1,4"] #row_1_cell_4 #cell_4,[data-hoveredClass="1,5"] #row_1_cell_1 #cell_1,[data-hoveredClass="1,5"] #row_1_cell_2 #cell_2,[data-hoveredClass="1,5"] #row_1_cell_3 #cell_3,[data-hoveredClass="1,5"] #row_1_cell_4 #cell_4,[data-hoveredClass="1,5"] #row_1_cell_5 #cell_5,[data-hoveredClass="1,6"] #row_1_cell_1 #cell_1,[data-hoveredClass="1,6"] #row_1_cell_2 #cell_2,[data-hoveredClass="1,6"] #row_1_cell_3 #cell_3,[data-hoveredClass="1,6"] #row_1_cell_4 #cell_4,[data-hoveredClass="1,6"] #row_1_cell_5 #cell_5,[data-hoveredClass="1,6"] #row_1_cell_6 #cell_6,[data-hoveredClass="2,1"] #row_1_cell_1 #cell_1,[data-hoveredClass="2,1"] #row_2_cell_1 #cell_1,[data-hoveredClass="2,2"] #row_1_cell_1 #cell_1,[data-hoveredClass="2,2"] #row_1_cell_2 #cell_2,[data-hoveredClass="2,2"] #row_2_cell_1 #cell_1,[data-hoveredClass="2,2"] #row_2_cell_2 #cell_2,[data-hoveredClass="2,3"] #row_1_cell_1 #cell_1,[data-hoveredClass="2,3"] #row_1_cell_2 #cell_2,[data-hoveredClass="2,3"] #row_1_cell_3 #cell_3,[data-hoveredClass="2,3"] #row_2_cell_1 #cell_1,[data-hoveredClass="2,3"] #row_2_cell_2 #cell_2,[data-hoveredClass="2,3"] #row_2_cell_3 #cell_3,[data-hoveredClass="2,4"] #row_1_cell_1 #cell_1,[data-hoveredClass="2,4"] #row_1_cell_2 #cell_2,[data-hoveredClass="2,4"] #row_1_cell_3 #cell_3,[data-hoveredClass="2,4"] #row_1_cell_4 #cell_4,[data-hoveredClass="2,4"] #row_2_cell_1 #cell_1,[data-hoveredClass="2,4"] #row_2_cell_2 #cell_2,[data-hoveredClass="2,4"] #row_2_cell_3 #cell_3,[data-hoveredClass="2,4"] #row_2_cell_4 #cell_4,[data-hoveredClass="2,5"] #row_1_cell_1 #cell_1,[data-hoveredClass="2,5"] #row_1_cell_2 #cell_2,[data-hoveredClass="2,5"] #row_1_cell_3 #cell_3,[data-hoveredClass="2,5"] #row_1_cell_4 #cell_4,[data-hoveredClass="2,5"] #row_1_cell_5 #cell_5,[data-hoveredClass="2,5"] #row_2_cell_1 #cell_1,[data-hoveredClass="2,5"] #row_2_cell_2 #cell_2,[data-hoveredClass="2,5"] #row_2_cell_3 #cell_3,[data-hoveredClass="2,5"] #row_2_cell_4 #cell_4,[data-hoveredClass="2,5"] #row_2_cell_5 #cell_5,[data-hoveredClass="2,6"] #row_1_cell_1 #cell_1,[data-hoveredClass="2,6"] #row_1_cell_2 #cell_2,[data-hoveredClass="2,6"] #row_1_cell_3 #cell_3,[data-hoveredClass="2,6"] #row_1_cell_4 #cell_4,[data-hoveredClass="2,6"] #row_1_cell_5 #cell_5,[data-hoveredClass="2,6"] #row_1_cell_6 #cell_6,[data-hoveredClass="2,6"] #row_2_cell_1 #cell_1,[data-hoveredClass="2,6"] #row_2_cell_2 #cell_2,[data-hoveredClass="2,6"] #row_2_cell_3 #cell_3,[data-hoveredClass="2,6"] #row_2_cell_4 #cell_4,[data-hoveredClass="2,6"] #row_2_cell_5 #cell_5,[data-hoveredClass="2,6"] #row_2_cell_6 #cell_6,[data-hoveredClass="3,1"] #row_1_cell_1 #cell_1,[data-hoveredClass="3,1"] #row_2_cell_1 #cell_1,[data-hoveredClass="3,1"] #row_3_cell_1 #cell_1,[data-hoveredClass="3,2"] #row_1_cell_1 #cell_1,[data-hoveredClass="3,2"] #row_1_cell_2 #cell_2,[data-hoveredClass="3,2"] #row_2_cell_1 #cell_1,[data-hoveredClass="3,2"] #row_2_cell_2 #cell_2,[data-hoveredClass="3,2"] #row_3_cell_1 #cell_1,[data-hoveredClass="3,2"] #row_3_cell_2 #cell_2,[data-hoveredClass="3,3"] #row_1_cell_1 #cell_1,[data-hoveredClass="3,3"] #row_1_cell_2 #cell_2,[data-hoveredClass="3,3"] #row_1_cell_3 #cell_3,[data-hoveredClass="3,3"] #row_2_cell_1 #cell_1,[data-hoveredClass="3,3"] #row_2_cell_2 #cell_2,[data-hoveredClass="3,3"] #row_2_cell_3 #cell_3,[data-hoveredClass="3,3"] #row_3_cell_1 #cell_1,[data-hoveredClass="3,3"] #row_3_cell_2 #cell_2,[data-hoveredClass="3,3"] #row_3_cell_3 #cell_3,[data-hoveredClass="3,4"] #row_1_cell_1 #cell_1,[data-hoveredClass="3,4"] #row_1_cell_2 #cell_2,[data-hoveredClass="3,4"] #row_1_cell_3 #cell_3,[data-hoveredClass="3,4"] #row_1_cell_4 #cell_4,[data-hoveredClass="3,4"] #row_2_cell_1 #cell_1,[data-hoveredClass="3,4"] #row_2_cell_2 #cell_2,[data-hoveredClass="3,4"] #row_2_cell_3 #cell_3,[data-hoveredClass="3,4"] #row_2_cell_4 #cell_4,[data-hoveredClass="3,4"] #row_3_cell_1 #cell_1,[data-hoveredClass="3,4"] #row_3_cell_2 #cell_2,[data-hoveredClass="3,4"] #row_3_cell_3 #cell_3,[data-hoveredClass="3,4"] #row_3_cell_4 #cell_4,[data-hoveredClass="3,5"] #row_1_cell_1 #cell_1,[data-hoveredClass="3,5"] #row_1_cell_2 #cell_2,[data-hoveredClass="3,5"] #row_1_cell_3 #cell_3,[data-hoveredClass="3,5"] #row_1_cell_4 #cell_4,[data-hoveredClass="3,5"] #row_1_cell_5 #cell_5,[data-hoveredClass="3,5"] #row_2_cell_1 #cell_1,[data-hoveredClass="3,5"] #row_2_cell_2 #cell_2,[data-hoveredClass="3,5"] #row_2_cell_3 #cell_3,[data-hoveredClass="3,5"] #row_2_cell_4 #cell_4,[data-hoveredClass="3,5"] #row_2_cell_5 #cell_5,[data-hoveredClass="3,5"] #row_3_cell_1 #cell_1,[data-hoveredClass="3,5"] #row_3_cell_2 #cell_2,[data-hoveredClass="3,5"] #row_3_cell_3 #cell_3,[data-hoveredClass="3,5"] #row_3_cell_4 #cell_4,[data-hoveredClass="3,5"] #row_3_cell_5 #cell_5,[data-hoveredClass="3,6"] #row_1_cell_1 #cell_1,[data-hoveredClass="3,6"] #row_1_cell_2 #cell_2,[data-hoveredClass="3,6"] #row_1_cell_3 #cell_3,[data-hoveredClass="3,6"] #row_1_cell_4 #cell_4,[data-hoveredClass="3,6"] #row_1_cell_5 #cell_5,[data-hoveredClass="3,6"] #row_1_cell_6 #cell_6,[data-hoveredClass="3,6"] #row_2_cell_1 #cell_1,[data-hoveredClass="3,6"] #row_2_cell_2 #cell_2,[data-hoveredClass="3,6"] #row_2_cell_3 #cell_3,[data-hoveredClass="3,6"] #row_2_cell_4 #cell_4,[data-hoveredClass="3,6"] #row_2_cell_5 #cell_5,[data-hoveredClass="3,6"] #row_2_cell_6 #cell_6,[data-hoveredClass="3,6"] #row_3_cell_1 #cell_1,[data-hoveredClass="3,6"] #row_3_cell_2 #cell_2,[data-hoveredClass="3,6"] #row_3_cell_3 #cell_3,[data-hoveredClass="3,6"] #row_3_cell_4 #cell_4,[data-hoveredClass="3,6"] #row_3_cell_5 #cell_5,[data-hoveredClass="3,6"] #row_3_cell_6 #cell_6,[data-hoveredClass="4,1"] #row_1_cell_1 #cell_1,[data-hoveredClass="4,1"] #row_2_cell_1 #cell_1,[data-hoveredClass="4,1"] #row_3_cell_1 #cell_1,[data-hoveredClass="4,1"] #row_4_cell_1 #cell_1,[data-hoveredClass="4,2"] #row_1_cell_1 #cell_1,[data-hoveredClass="4,2"] #row_1_cell_2 #cell_2,[data-hoveredClass="4,2"] #row_2_cell_1 #cell_1,[data-hoveredClass="4,2"] #row_2_cell_2 #cell_2,[data-hoveredClass="4,2"] #row_3_cell_1 #cell_1,[data-hoveredClass="4,2"] #row_3_cell_2 #cell_2,[data-hoveredClass="4,2"] #row_4_cell_1 #cell_1,[data-hoveredClass="4,2"] #row_4_cell_2 #cell_2,[data-hoveredClass="4,3"] #row_1_cell_1 #cell_1,[data-hoveredClass="4,3"] #row_1_cell_2 #cell_2,[data-hoveredClass="4,3"] #row_1_cell_3 #cell_3,[data-hoveredClass="4,3"] #row_2_cell_1 #cell_1,[data-hoveredClass="4,3"] #row_2_cell_2 #cell_2,[data-hoveredClass="4,3"] #row_2_cell_3 #cell_3,[data-hoveredClass="4,3"] #row_3_cell_1 #cell_1,[data-hoveredClass="4,3"] #row_3_cell_2 #cell_2,[data-hoveredClass="4,3"] #row_3_cell_3 #cell_3,[data-hoveredClass="4,3"] #row_4_cell_1 #cell_1,[data-hoveredClass="4,3"] #row_4_cell_2 #cell_2,[data-hoveredClass="4,3"] #row_4_cell_3 #cell_3,[data-hoveredClass="4,4"] #row_1_cell_1 #cell_1,[data-hoveredClass="4,4"] #row_1_cell_2 #cell_2,[data-hoveredClass="4,4"] #row_1_cell_3 #cell_3,[data-hoveredClass="4,4"] #row_1_cell_4 #cell_4,[data-hoveredClass="4,4"] #row_2_cell_1 #cell_1,[data-hoveredClass="4,4"] #row_2_cell_2 #cell_2,[data-hoveredClass="4,4"] #row_2_cell_3 #cell_3,[data-hoveredClass="4,4"] #row_2_cell_4 #cell_4,[data-hoveredClass="4,4"] #row_3_cell_1 #cell_1,[data-hoveredClass="4,4"] #row_3_cell_2 #cell_2,[data-hoveredClass="4,4"] #row_3_cell_3 #cell_3,[data-hoveredClass="4,4"] #row_3_cell_4 #cell_4,[data-hoveredClass="4,4"] #row_4_cell_1 #cell_1,[data-hoveredClass="4,4"] #row_4_cell_2 #cell_2,[data-hoveredClass="4,4"] #row_4_cell_3 #cell_3,[data-hoveredClass="4,4"] #row_4_cell_4 #cell_4,[data-hoveredClass="4,5"] #row_1_cell_1 #cell_1,[data-hoveredClass="4,5"] #row_1_cell_2 #cell_2,[data-hoveredClass="4,5"] #row_1_cell_3 #cell_3,[data-hoveredClass="4,5"] #row_1_cell_4 #cell_4,[data-hoveredClass="4,5"] #row_1_cell_5 #cell_5,[data-hoveredClass="4,5"] #row_2_cell_1 #cell_1,[data-hoveredClass="4,5"] #row_2_cell_2 #cell_2,[data-hoveredClass="4,5"] #row_2_cell_3 #cell_3,[data-hoveredClass="4,5"] #row_2_cell_4 #cell_4,[data-hoveredClass="4,5"] #row_2_cell_5 #cell_5,[data-hoveredClass="4,5"] #row_3_cell_1 #cell_1,[data-hoveredClass="4,5"] #row_3_cell_2 #cell_2,[data-hoveredClass="4,5"] #row_3_cell_3 #cell_3,[data-hoveredClass="4,5"] #row_3_cell_4 #cell_4,[data-hoveredClass="4,5"] #row_3_cell_5 #cell_5,[data-hoveredClass="4,5"] #row_4_cell_1 #cell_1,[data-hoveredClass="4,5"] #row_4_cell_2 #cell_2,[data-hoveredClass="4,5"] #row_4_cell_3 #cell_3,[data-hoveredClass="4,5"] #row_4_cell_4 #cell_4,[data-hoveredClass="4,5"] #row_4_cell_5 #cell_5,[data-hoveredClass="4,6"] #row_1_cell_1 #cell_1,[data-hoveredClass="4,6"] #row_1_cell_2 #cell_2,[data-hoveredClass="4,6"] #row_1_cell_3 #cell_3,[data-hoveredClass="4,6"] #row_1_cell_4 #cell_4,[data-hoveredClass="4,6"] #row_1_cell_5 #cell_5,[data-hoveredClass="4,6"] #row_1_cell_6 #cell_6,[data-hoveredClass="4,6"] #row_2_cell_1 #cell_1,[data-hoveredClass="4,6"] #row_2_cell_2 #cell_2,[data-hoveredClass="4,6"] #row_2_cell_3 #cell_3,[data-hoveredClass="4,6"] #row_2_cell_4 #cell_4,[data-hoveredClass="4,6"] #row_2_cell_5 #cell_5,[data-hoveredClass="4,6"] #row_2_cell_6 #cell_6,[data-hoveredClass="4,6"] #row_3_cell_1 #cell_1,[data-hoveredClass="4,6"] #row_3_cell_2 #cell_2,[data-hoveredClass="4,6"] #row_3_cell_3 #cell_3,[data-hoveredClass="4,6"] #row_3_cell_4 #cell_4,[data-hoveredClass="4,6"] #row_3_cell_5 #cell_5,[data-hoveredClass="4,6"] #row_3_cell_6 #cell_6,[data-hoveredClass="4,6"] #row_4_cell_1 #cell_1,[data-hoveredClass="4,6"] #row_4_cell_2 #cell_2,[data-hoveredClass="4,6"] #row_4_cell_3 #cell_3,[data-hoveredClass="4,6"] #row_4_cell_4 #cell_4,[data-hoveredClass="4,6"] #row_4_cell_5 #cell_5,[data-hoveredClass="4,6"] #row_4_cell_6 #cell_6,[data-hoveredClass="5,1"] #row_1_cell_1 #cell_1,[data-hoveredClass="5,1"] #row_2_cell_1 #cell_1,[data-hoveredClass="5,1"] #row_3_cell_1 #cell_1,[data-hoveredClass="5,1"] #row_4_cell_1 #cell_1,[data-hoveredClass="5,1"] #row_5_cell_1 #cell_1,[data-hoveredClass="5,2"] #row_1_cell_1 #cell_1,[data-hoveredClass="5,2"] #row_1_cell_2 #cell_2,[data-hoveredClass="5,2"] #row_2_cell_1 #cell_1,[data-hoveredClass="5,2"] #row_2_cell_2 #cell_2,[data-hoveredClass="5,2"] #row_3_cell_1 #cell_1,[data-hoveredClass="5,2"] #row_3_cell_2 #cell_2,[data-hoveredClass="5,2"] #row_4_cell_1 #cell_1,[data-hoveredClass="5,2"] #row_4_cell_2 #cell_2,[data-hoveredClass="5,2"] #row_5_cell_1 #cell_1,[data-hoveredClass="5,2"] #row_5_cell_2 #cell_2,[data-hoveredClass="5,3"] #row_1_cell_1 #cell_1,[data-hoveredClass="5,3"] #row_1_cell_2 #cell_2,[data-hoveredClass="5,3"] #row_1_cell_3 #cell_3,[data-hoveredClass="5,3"] #row_2_cell_1 #cell_1,[data-hoveredClass="5,3"] #row_2_cell_2 #cell_2,[data-hoveredClass="5,3"] #row_2_cell_3 #cell_3,[data-hoveredClass="5,3"] #row_3_cell_1 #cell_1,[data-hoveredClass="5,3"] #row_3_cell_2 #cell_2,[data-hoveredClass="5,3"] #row_3_cell_3 #cell_3,[data-hoveredClass="5,3"] #row_4_cell_1 #cell_1,[data-hoveredClass="5,3"] #row_4_cell_2 #cell_2,[data-hoveredClass="5,3"] #row_4_cell_3 #cell_3,[data-hoveredClass="5,3"] #row_5_cell_1 #cell_1,[data-hoveredClass="5,3"] #row_5_cell_2 #cell_2,[data-hoveredClass="5,3"] #row_5_cell_3 #cell_3,[data-hoveredClass="5,4"] #row_1_cell_1 #cell_1,[data-hoveredClass="5,4"] #row_1_cell_2 #cell_2,[data-hoveredClass="5,4"] #row_1_cell_3 #cell_3,[data-hoveredClass="5,4"] #row_1_cell_4 #cell_4,[data-hoveredClass="5,4"] #row_2_cell_1 #cell_1,[data-hoveredClass="5,4"] #row_2_cell_2 #cell_2,[data-hoveredClass="5,4"] #row_2_cell_3 #cell_3,[data-hoveredClass="5,4"] #row_2_cell_4 #cell_4,[data-hoveredClass="5,4"] #row_3_cell_1 #cell_1,[data-hoveredClass="5,4"] #row_3_cell_2 #cell_2,[data-hoveredClass="5,4"] #row_3_cell_3 #cell_3,[data-hoveredClass="5,4"] #row_3_cell_4 #cell_4,[data-hoveredClass="5,4"] #row_4_cell_1 #cell_1,[data-hoveredClass="5,4"] #row_4_cell_2 #cell_2,[data-hoveredClass="5,4"] #row_4_cell_3 #cell_3,[data-hoveredClass="5,4"] #row_4_cell_4 #cell_4,[data-hoveredClass="5,4"] #row_5_cell_1 #cell_1,[data-hoveredClass="5,4"] #row_5_cell_2 #cell_2,[data-hoveredClass="5,4"] #row_5_cell_3 #cell_3,[data-hoveredClass="5,4"] #row_5_cell_4 #cell_4,[data-hoveredClass="5,5"] #row_1_cell_1 #cell_1,[data-hoveredClass="5,5"] #row_1_cell_2 #cell_2,[data-hoveredClass="5,5"] #row_1_cell_3 #cell_3,[data-hoveredClass="5,5"] #row_1_cell_4 #cell_4,[data-hoveredClass="5,5"] #row_1_cell_5 #cell_5,[data-hoveredClass="5,5"] #row_2_cell_1 #cell_1,[data-hoveredClass="5,5"] #row_2_cell_2 #cell_2,[data-hoveredClass="5,5"] #row_2_cell_3 #cell_3,[data-hoveredClass="5,5"] #row_2_cell_4 #cell_4,[data-hoveredClass="5,5"] #row_2_cell_5 #cell_5,[data-hoveredClass="5,5"] #row_3_cell_1 #cell_1,[data-hoveredClass="5,5"] #row_3_cell_2 #cell_2,[data-hoveredClass="5,5"] #row_3_cell_3 #cell_3,[data-hoveredClass="5,5"] #row_3_cell_4 #cell_4,[data-hoveredClass="5,5"] #row_3_cell_5 #cell_5,[data-hoveredClass="5,5"] #row_4_cell_1 #cell_1,[data-hoveredClass="5,5"] #row_4_cell_2 #cell_2,[data-hoveredClass="5,5"] #row_4_cell_3 #cell_3,[data-hoveredClass="5,5"] #row_4_cell_4 #cell_4,[data-hoveredClass="5,5"] #row_4_cell_5 #cell_5,[data-hoveredClass="5,5"] #row_5_cell_1 #cell_1,[data-hoveredClass="5,5"] #row_5_cell_2 #cell_2,[data-hoveredClass="5,5"] #row_5_cell_3 #cell_3,[data-hoveredClass="5,5"] #row_5_cell_4 #cell_4,[data-hoveredClass="5,5"] #row_5_cell_5 #cell_5,[data-hoveredClass="5,6"] #row_1_cell_1 #cell_1,[data-hoveredClass="5,6"] #row_1_cell_2 #cell_2,[data-hoveredClass="5,6"] #row_1_cell_3 #cell_3,[data-hoveredClass="5,6"] #row_1_cell_4 #cell_4,[data-hoveredClass="5,6"] #row_1_cell_5 #cell_5,[data-hoveredClass="5,6"] #row_1_cell_6 #cell_6,[data-hoveredClass="5,6"] #row_2_cell_1 #cell_1,[data-hoveredClass="5,6"] #row_2_cell_2 #cell_2,[data-hoveredClass="5,6"] #row_2_cell_3 #cell_3,[data-hoveredClass="5,6"] #row_2_cell_4 #cell_4,[data-hoveredClass="5,6"] #row_2_cell_5 #cell_5,[data-hoveredClass="5,6"] #row_2_cell_6 #cell_6,[data-hoveredClass="5,6"] #row_3_cell_1 #cell_1,[data-hoveredClass="5,6"] #row_3_cell_2 #cell_2,[data-hoveredClass="5,6"] #row_3_cell_3 #cell_3,[data-hoveredClass="5,6"] #row_3_cell_4 #cell_4,[data-hoveredClass="5,6"] #row_3_cell_5 #cell_5,[data-hoveredClass="5,6"] #row_3_cell_6 #cell_6,[data-hoveredClass="5,6"] #row_4_cell_1 #cell_1,[data-hoveredClass="5,6"] #row_4_cell_2 #cell_2,[data-hoveredClass="5,6"] #row_4_cell_3 #cell_3,[data-hoveredClass="5,6"] #row_4_cell_4 #cell_4,[data-hoveredClass="5,6"] #row_4_cell_5 #cell_5,[data-hoveredClass="5,6"] #row_4_cell_6 #cell_6,[data-hoveredClass="5,6"] #row_5_cell_1 #cell_1,[data-hoveredClass="5,6"] #row_5_cell_2 #cell_2,[data-hoveredClass="5,6"] #row_5_cell_3 #cell_3,[data-hoveredClass="5,6"] #row_5_cell_4 #cell_4,[data-hoveredClass="5,6"] #row_5_cell_5 #cell_5,[data-hoveredClass="5,6"] #row_5_cell_6 #cell_6,[data-hoveredClass="6,1"] #row_1_cell_1 #cell_1,[data-hoveredClass="6,1"] #row_2_cell_1 #cell_1,[data-hoveredClass="6,1"] #row_3_cell_1 #cell_1,[data-hoveredClass="6,1"] #row_4_cell_1 #cell_1,[data-hoveredClass="6,1"] #row_5_cell_1 #cell_1,[data-hoveredClass="6,1"] #row_6_cell_1 #cell_1,[data-hoveredClass="6,2"] #row_1_cell_1 #cell_1,[data-hoveredClass="6,2"] #row_1_cell_2 #cell_2,[data-hoveredClass="6,2"] #row_2_cell_1 #cell_1,[data-hoveredClass="6,2"] #row_2_cell_2 #cell_2,[data-hoveredClass="6,2"] #row_3_cell_1 #cell_1,[data-hoveredClass="6,2"] #row_3_cell_2 #cell_2,[data-hoveredClass="6,2"] #row_4_cell_1 #cell_1,[data-hoveredClass="6,2"] #row_4_cell_2 #cell_2,[data-hoveredClass="6,2"] #row_5_cell_1 #cell_1,[data-hoveredClass="6,2"] #row_5_cell_2 #cell_2,[data-hoveredClass="6,2"] #row_6_cell_1 #cell_1,[data-hoveredClass="6,2"] #row_6_cell_2 #cell_2,[data-hoveredClass="6,3"] #row_1_cell_1 #cell_1,[data-hoveredClass="6,3"] #row_1_cell_2 #cell_2,[data-hoveredClass="6,3"] #row_1_cell_3 #cell_3,[data-hoveredClass="6,3"] #row_2_cell_1 #cell_1,[data-hoveredClass="6,3"] #row_2_cell_2 #cell_2,[data-hoveredClass="6,3"] #row_2_cell_3 #cell_3,[data-hoveredClass="6,3"] #row_3_cell_1 #cell_1,[data-hoveredClass="6,3"] #row_3_cell_2 #cell_2,[data-hoveredClass="6,3"] #row_3_cell_3 #cell_3,[data-hoveredClass="6,3"] #row_4_cell_1 #cell_1,[data-hoveredClass="6,3"] #row_4_cell_2 #cell_2,[data-hoveredClass="6,3"] #row_4_cell_3 #cell_3,[data-hoveredClass="6,3"] #row_5_cell_1 #cell_1,[data-hoveredClass="6,3"] #row_5_cell_2 #cell_2,[data-hoveredClass="6,3"] #row_5_cell_3 #cell_3,[data-hoveredClass="6,3"] #row_6_cell_1 #cell_1,[data-hoveredClass="6,3"] #row_6_cell_2 #cell_2,[data-hoveredClass="6,3"] #row_6_cell_3 #cell_3,[data-hoveredClass="6,4"] #row_1_cell_1 #cell_1,[data-hoveredClass="6,4"] #row_1_cell_2 #cell_2,[data-hoveredClass="6,4"] #row_1_cell_3 #cell_3,[data-hoveredClass="6,4"] #row_1_cell_4 #cell_4,[data-hoveredClass="6,4"] #row_2_cell_1 #cell_1,[data-hoveredClass="6,4"] #row_2_cell_2 #cell_2,[data-hoveredClass="6,4"] #row_2_cell_3 #cell_3,[data-hoveredClass="6,4"] #row_2_cell_4 #cell_4,[data-hoveredClass="6,4"] #row_3_cell_1 #cell_1,[data-hoveredClass="6,4"] #row_3_cell_2 #cell_2,[data-hoveredClass="6,4"] #row_3_cell_3 #cell_3,[data-hoveredClass="6,4"] #row_3_cell_4 #cell_4,[data-hoveredClass="6,4"] #row_4_cell_1 #cell_1,[data-hoveredClass="6,4"] #row_4_cell_2 #cell_2,[data-hoveredClass="6,4"] #row_4_cell_3 #cell_3,[data-hoveredClass="6,4"] #row_4_cell_4 #cell_4,[data-hoveredClass="6,4"] #row_5_cell_1 #cell_1,[data-hoveredClass="6,4"] #row_5_cell_2 #cell_2,[data-hoveredClass="6,4"] #row_5_cell_3 #cell_3,[data-hoveredClass="6,4"] #row_5_cell_4 #cell_4,[data-hoveredClass="6,4"] #row_6_cell_1 #cell_1,[data-hoveredClass="6,4"] #row_6_cell_2 #cell_2,[data-hoveredClass="6,4"] #row_6_cell_3 #cell_3,[data-hoveredClass="6,4"] #row_6_cell_4 #cell_4,[data-hoveredClass="6,5"] #row_1_cell_1 #cell_1,[data-hoveredClass="6,5"] #row_1_cell_2 #cell_2,[data-hoveredClass="6,5"] #row_1_cell_3 #cell_3,[data-hoveredClass="6,5"] #row_1_cell_4 #cell_4,[data-hoveredClass="6,5"] #row_1_cell_5 #cell_5,[data-hoveredClass="6,5"] #row_2_cell_1 #cell_1,[data-hoveredClass="6,5"] #row_2_cell_2 #cell_2,[data-hoveredClass="6,5"] #row_2_cell_3 #cell_3,[data-hoveredClass="6,5"] #row_2_cell_4 #cell_4,[data-hoveredClass="6,5"] #row_2_cell_5 #cell_5,[data-hoveredClass="6,5"] #row_3_cell_1 #cell_1,[data-hoveredClass="6,5"] #row_3_cell_2 #cell_2,[data-hoveredClass="6,5"] #row_3_cell_3 #cell_3,[data-hoveredClass="6,5"] #row_3_cell_4 #cell_4,[data-hoveredClass="6,5"] #row_3_cell_5 #cell_5,[data-hoveredClass="6,5"] #row_4_cell_1 #cell_1,[data-hoveredClass="6,5"] #row_4_cell_2 #cell_2,[data-hoveredClass="6,5"] #row_4_cell_3 #cell_3,[data-hoveredClass="6,5"] #row_4_cell_4 #cell_4,[data-hoveredClass="6,5"] #row_4_cell_5 #cell_5,[data-hoveredClass="6,5"] #row_5_cell_1 #cell_1,[data-hoveredClass="6,5"] #row_5_cell_2 #cell_2,[data-hoveredClass="6,5"] #row_5_cell_3 #cell_3,[data-hoveredClass="6,5"] #row_5_cell_4 #cell_4,[data-hoveredClass="6,5"] #row_5_cell_5 #cell_5,[data-hoveredClass="6,5"] #row_6_cell_1 #cell_1,[data-hoveredClass="6,5"] #row_6_cell_2 #cell_2,[data-hoveredClass="6,5"] #row_6_cell_3 #cell_3,[data-hoveredClass="6,5"] #row_6_cell_4 #cell_4,[data-hoveredClass="6,5"] #row_6_cell_5 #cell_5,[data-hoveredClass="6,6"] #row_1_cell_1 #cell_1,[data-hoveredClass="6,6"] #row_1_cell_2 #cell_2,[data-hoveredClass="6,6"] #row_1_cell_3 #cell_3,[data-hoveredClass="6,6"] #row_1_cell_4 #cell_4,[data-hoveredClass="6,6"] #row_1_cell_5 #cell_5,[data-hoveredClass="6,6"] #row_1_cell_6 #cell_6,[data-hoveredClass="6,6"] #row_2_cell_1 #cell_1,[data-hoveredClass="6,6"] #row_2_cell_2 #cell_2,[data-hoveredClass="6,6"] #row_2_cell_3 #cell_3,[data-hoveredClass="6,6"] #row_2_cell_4 #cell_4,[data-hoveredClass="6,6"] #row_2_cell_5 #cell_5,[data-hoveredClass="6,6"] #row_2_cell_6 #cell_6,[data-hoveredClass="6,6"] #row_3_cell_1 #cell_1,[data-hoveredClass="6,6"] #row_3_cell_2 #cell_2,[data-hoveredClass="6,6"] #row_3_cell_3 #cell_3,[data-hoveredClass="6,6"] #row_3_cell_4 #cell_4,[data-hoveredClass="6,6"] #row_3_cell_5 #cell_5,[data-hoveredClass="6,6"] #row_3_cell_6 #cell_6,[data-hoveredClass="6,6"] #row_4_cell_1 #cell_1,[data-hoveredClass="6,6"] #row_4_cell_2 #cell_2,[data-hoveredClass="6,6"] #row_4_cell_3 #cell_3,[data-hoveredClass="6,6"] #row_4_cell_4 #cell_4,[data-hoveredClass="6,6"] #row_4_cell_5 #cell_5,[data-hoveredClass="6,6"] #row_4_cell_6 #cell_6,[data-hoveredClass="6,6"] #row_5_cell_1 #cell_1,[data-hoveredClass="6,6"] #row_5_cell_2 #cell_2,[data-hoveredClass="6,6"] #row_5_cell_3 #cell_3,[data-hoveredClass="6,6"] #row_5_cell_4 #cell_4,[data-hoveredClass="6,6"] #row_5_cell_5 #cell_5,[data-hoveredClass="6,6"] #row_5_cell_6 #cell_6,[data-hoveredClass="6,6"] #row_6_cell_1 #cell_1,[data-hoveredClass="6,6"] #row_6_cell_2 #cell_2,[data-hoveredClass="6,6"] #row_6_cell_3 #cell_3,[data-hoveredClass="6,6"] #row_6_cell_4 #cell_4,[data-hoveredClass="6,6"] #row_6_cell_5 #cell_5,[data-hoveredClass="6,6"] #row_6_cell_6 #cell_6{background:#d5e4f9;border:1px solid #c0cffd}',""]);},function(e,l){e.exports='<svg width="18" height="14"><path d="M2.833 8v1.95a1.7 1.7 0 0 0 1.7 1.7h3.45V8h-5.15zm0-2h5.15V2.35h-3.45a1.7 1.7 0 0 0-1.7 1.7V6zm12.3 2h-5.15v3.65h3.45a1.7 1.7 0 0 0 1.7-1.7V8zm0-2V4.05a1.7 1.7 0 0 0-1.7-1.7h-3.45V6h5.15zM4.533.1h8.9a3.95 3.95 0 0 1 3.95 3.95v5.9a3.95 3.95 0 0 1-3.95 3.95h-8.9a3.95 3.95 0 0 1-3.95-3.95v-5.9A3.95 3.95 0 0 1 4.533.1z"></path></svg>';},function(e,l){e.exports='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-21 0 512 512" width="18" height="18"><path d="M181.332031 106.667969c-3.925781 0-7.828125-1.429688-10.921875-4.3125l-80-74.664063c-4.820312-4.480468-6.378906-11.457031-3.96875-17.558594C88.851562 4.011719 94.761719 0 101.332031 0h160c6.570313 0 12.480469 4.011719 14.871094 10.132812 2.410156 6.125.851563 13.078126-3.96875 17.558594l-80 74.664063c-3.070313 2.882812-6.976563 4.3125-10.902344 4.3125zM141.910156 32l39.421875 36.777344L220.757812 32zm0 0M90.667969 512H37.332031C16.746094 512 0 495.253906 0 474.667969V144c0-20.585938 16.746094-37.332031 37.332031-37.332031h53.335938C111.253906 106.667969 128 123.414062 128 144v330.667969C128 495.253906 111.253906 512 90.667969 512zM37.332031 138.667969C34.390625 138.667969 32 141.054688 32 144v330.667969C32 477.609375 34.390625 480 37.332031 480h53.335938C93.609375 480 96 477.609375 96 474.667969V144c0-2.945312-2.390625-5.332031-5.332031-5.332031zm0 0M432 512H272c-20.585938 0-37.332031-16.746094-37.332031-37.332031V144c0-20.585938 16.746093-37.332031 37.332031-37.332031h160c20.585938 0 37.332031 16.746093 37.332031 37.332031v330.667969C469.332031 495.253906 452.585938 512 432 512zM272 138.667969c-2.945312 0-5.332031 2.386719-5.332031 5.332031v330.667969C266.667969 477.609375 269.054688 480 272 480h160c2.945312 0 5.332031-2.390625 5.332031-5.332031V144c0-2.945312-2.386719-5.332031-5.332031-5.332031zm0 0"></path><path d="M112 325.332031H16c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h96c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0M453.332031 325.332031H250.667969c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h202.664062c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0"></path><path d="M352 512c-8.832031 0-16-7.167969-16-16V122.667969c0-8.832031 7.167969-16 16-16s16 7.167969 16 16V496c0 8.832031-7.167969 16-16 16zm0 0"></path></svg>';},function(e,l){e.exports='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-21 0 512 512" width="18" height="18"><path d="M288 106.667969c-3.925781 0-7.851562-1.429688-10.921875-4.3125l-80-74.664063c-4.800781-4.480468-6.378906-11.457031-3.96875-17.558594C195.519531 4.03125 201.429688 0 208 0h160c6.570312 0 12.480469 4.011719 14.890625 10.132812 2.410156 6.125.832031 13.078126-3.96875 17.558594l-80 74.664063c-3.070313 2.882812-6.996094 4.3125-10.921875 4.3125zM248.597656 32L288 68.777344 327.402344 32zm0 0M432 512h-53.332031c-20.589844 0-37.335938-16.746094-37.335938-37.332031V144c0-20.585938 16.746094-37.332031 37.335938-37.332031H432c20.585938 0 37.332031 16.746093 37.332031 37.332031v330.667969C469.332031 495.253906 452.585938 512 432 512zm-53.332031-373.332031c-2.945313 0-5.335938 2.386719-5.335938 5.332031v330.667969c0 2.941406 2.390625 5.332031 5.335938 5.332031H432c2.945312 0 5.332031-2.390625 5.332031-5.332031V144c0-2.945312-2.386719-5.332031-5.332031-5.332031zm0 0M197.332031 512h-160C16.746094 512 0 495.253906 0 474.667969V144c0-20.585938 16.746094-37.332031 37.332031-37.332031h160c20.589844 0 37.335938 16.746093 37.335938 37.332031v330.667969c0 20.585937-16.746094 37.332031-37.335938 37.332031zm-160-373.332031C34.390625 138.667969 32 141.054688 32 144v330.667969C32 477.609375 34.390625 480 37.332031 480h160c2.945313 0 5.335938-2.390625 5.335938-5.332031V144c0-2.945312-2.390625-5.332031-5.335938-5.332031zm0 0"></path><path d="M453.332031 325.332031h-96c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h96c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0M218.667969 325.332031H16c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h202.667969c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0"></path><path d="M117.332031 512c-8.832031 0-16-7.167969-16-16V122.667969c0-8.832031 7.167969-16 16-16s16 7.167969 16 16V496c0 8.832031-7.167969 16-16 16zm0 0"></path></svg>';},function(e,l){e.exports='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -21 512 512" width="18" height="18"><path d="M16 277.332031c-1.984375 0-3.96875-.363281-5.867188-1.109375C4.011719 273.8125 0 267.902344 0 261.332031v-160c0-6.570312 4.011719-12.480469 10.132812-14.890625 6.144532-2.410156 13.078126-.851562 17.558594 3.96875l74.664063 80c5.761719 6.144532 5.761719 15.679688 0 21.824219l-74.664063 80C24.597656 275.5625 20.351562 277.332031 16 277.332031zm16-135.402343v78.804687l36.777344-39.402344zm0 0M474.667969 128H144c-20.585938 0-37.332031-16.746094-37.332031-37.332031V37.332031C106.667969 16.746094 123.414062 0 144 0h330.667969C495.253906 0 512 16.746094 512 37.332031v53.335938C512 111.253906 495.253906 128 474.667969 128zM144 32c-2.945312 0-5.332031 2.390625-5.332031 5.332031v53.335938C138.667969 93.609375 141.054688 96 144 96h330.667969C477.609375 96 480 93.609375 480 90.667969V37.332031C480 34.390625 477.609375 32 474.667969 32zm0 0M474.667969 469.332031H144c-20.585938 0-37.332031-16.746093-37.332031-37.332031V272c0-20.585938 16.746093-37.332031 37.332031-37.332031h330.667969C495.253906 234.667969 512 251.414062 512 272v160c0 20.585938-16.746094 37.332031-37.332031 37.332031zM144 266.667969c-2.945312 0-5.332031 2.386719-5.332031 5.332031v160c0 2.945312 2.386719 5.332031 5.332031 5.332031h330.667969C477.609375 437.332031 480 434.945312 480 432V272c0-2.945312-2.390625-5.332031-5.332031-5.332031zm0 0"></path><path d="M309.332031 128c-8.832031 0-16-7.167969-16-16V16c0-8.832031 7.167969-16 16-16s16 7.167969 16 16v96c0 8.832031-7.167969 16-16 16zm0 0M309.332031 469.332031c-8.832031 0-16-7.167969-16-16V250.667969c0-8.832031 7.167969-16 16-16s16 7.167969 16 16v202.664062c0 8.832031-7.167969 16-16 16zm0 0"></path><path d="M496 368H122.667969c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16H496c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0"></path></svg>';},function(e,l){e.exports='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -21 512 512" width="18" height="18"><path d="M16 384c-1.984375 0-3.96875-.363281-5.867188-1.109375C4.011719 380.480469 0 374.570312 0 368V208c0-6.570312 4.011719-12.480469 10.132812-14.890625 6.144532-2.410156 13.078126-.851563 17.558594 3.96875l74.664063 80c5.761719 6.144531 5.761719 15.679687 0 21.824219l-74.664063 80C24.597656 382.230469 20.351562 384 16 384zm16-135.402344v78.804688L68.777344 288zm0 0M474.667969 469.332031H144c-20.585938 0-37.332031-16.746093-37.332031-37.332031v-53.332031c0-20.589844 16.746093-37.335938 37.332031-37.335938h330.667969c20.585937 0 37.332031 16.746094 37.332031 37.335938V432c0 20.585938-16.746094 37.332031-37.332031 37.332031zm-330.667969-96c-2.945312 0-5.332031 2.390625-5.332031 5.335938V432c0 2.945312 2.386719 5.332031 5.332031 5.332031h330.667969C477.609375 437.332031 480 434.945312 480 432v-53.332031c0-2.945313-2.390625-5.335938-5.332031-5.335938zm0 0M474.667969 234.667969H144c-20.585938 0-37.332031-16.746094-37.332031-37.335938v-160C106.667969 16.746094 123.414062 0 144 0h330.667969C495.253906 0 512 16.746094 512 37.332031v160c0 20.589844-16.746094 37.335938-37.332031 37.335938zM144 32c-2.945312 0-5.332031 2.390625-5.332031 5.332031v160c0 2.945313 2.386719 5.335938 5.332031 5.335938h330.667969c2.941406 0 5.332031-2.390625 5.332031-5.335938v-160C480 34.390625 477.609375 32 474.667969 32zm0 0"></path><path d="M309.332031 469.332031c-8.832031 0-16-7.167969-16-16v-96c0-8.832031 7.167969-16 16-16s16 7.167969 16 16v96c0 8.832031-7.167969 16-16 16zm0 0M309.332031 234.667969c-8.832031 0-16-7.167969-16-16V16c0-8.832031 7.167969-16 16-16s16 7.167969 16 16v202.667969c0 8.832031-7.167969 16-16 16zm0 0"></path><path d="M496 133.332031H122.667969c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16H496c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0"></path></svg>';},function(e,l){e.exports='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15.381 15.381" width="18" height="18"><g><path d="M0 1.732v7.732h6.053c0-.035-.004-.07-.004-.104 0-.434.061-.854.165-1.255H1.36V3.092h12.662v2.192c.546.396 1.01.897 1.359 1.477V1.732H0z"></path><path d="M11.196 5.28c-2.307 0-4.183 1.877-4.183 4.184 0 2.308 1.876 4.185 4.183 4.185 2.309 0 4.185-1.877 4.185-4.185 0-2.307-1.876-4.184-4.185-4.184zm0 7.233c-1.679 0-3.047-1.367-3.047-3.049 0-1.68 1.368-3.049 3.047-3.049 1.684 0 3.05 1.369 3.05 3.049 0 1.682-1.366 3.049-3.05 3.049z"></path><path d="M9.312 8.759h3.844v1.104H9.312z"></path></g></svg>';},function(e,l){e.exports='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" width="18" height="18"><path d="M13.594 20.85V24h-10V2h10v3.15c.633-.323 1.304-.565 2-.727V1c0-.551-.448-1-1-1h-12c-.55 0-1 .449-1 1v24c0 .551.449 1 1 1h12c.552 0 1-.449 1-1v-3.424c-.696-.161-1.367-.403-2-.726z"></path><path d="M17.594 6.188c-3.762 0-6.813 3.051-6.812 6.813-.001 3.761 3.05 6.812 6.812 6.812s6.813-3.051 6.813-6.813-3.052-6.812-6.813-6.812zm3.632 7.802l-7.267.001v-1.982h7.268l-.001 1.981z"></path></svg>';},function(e,l,a){a.r(l),a.d(l,"TableConstructor",(function(){return w}));a(3);function _(e){return !(null==e)}function t(e,l=null,a=null,t=null){const r=document.createElement(e);if(_(l))for(let e=0;e<l.length;e++)_(l[e])&&r.classList.add(l[e]);if(_(a))for(let e in a)r.setAttribute(e,a[e]);if(_(t))for(let e=0;e<t.length;e++)_(t[e])&&r.appendChild(t[e]);return r}a(6);const r="tc-table",o="tc-table__inp",s="tc-table__cell",c="tc-table__wrap",d="tc-table__area",h="tc-table__highlight";class n{constructor(){this._numberOfColumns=0,this._numberOfRows=0,this._element=this._createTableWrapper(),this._table=this._element.querySelector("table"),this._selectedCell=null,this._attachEvents();}get selectedCell(){return this._selectedCell}set selectedCell(e){this._selectedCell&&this._selectedCell.classList.remove(h),this._selectedCell=e,this._selectedCell&&this._selectedCell.classList.add(h);}get selectedRow(){return this.selectedCell?this.selectedCell.closest("tr"):null}insertColumnAfter(){this.insertColumn(1),this.focusCellOnSelectedCell();}insertColumnBefore(){this.insertColumn(),this.focusCellOnSelectedCell();}insertRowBefore(){this.insertRow(),this.focusCellOnSelectedCell();}insertRowAfter(){this.insertRow(1),this.focusCellOnSelectedCell();}insertColumn(e=0){e=Math.min(Math.max(e,0),1);const l=this.selectedCell?this.selectedCell.cellIndex+e:0;this._numberOfColumns++;const a=this._table.rows;for(let e=0;e<a.length;e++){const _=a[e].insertCell(l);this._fillCell(_);}}deleteColumn(){if(!this.selectedCell)return;const e=this.selectedCell.cellIndex;this._numberOfColumns--;const l=this._table.rows;for(let a=0;a<l.length;a++)l[a].deleteCell(e);}insertRow(e=0){e=Math.min(Math.max(e,0),1);const l=this.selectedRow?this.selectedRow.rowIndex+e:0,a=this._table.insertRow(l);return this._numberOfRows++,this._fillRow(a),a}deleteRow(e=-1){if(!this.selectedRow)return;const l=this.selectedRow.rowIndex;this._table.deleteRow(l),this._numberOfRows--;}get htmlElement(){return this._element}get body(){return this._table}_createTableWrapper(){return t("div",[c],null,[t("table",[r])])}_createContenteditableArea(){return t("div",[o],{contenteditable:"true"})}_fillCell(e){e.classList.add(s);const l=this._createContenteditableArea();e.appendChild(t("div",[d],null,[l]));}_fillRow(e){for(let l=0;l<this._numberOfColumns;l++){const l=e.insertCell();this._fillCell(l);}}_attachEvents(){this._table.addEventListener("focus",e=>{this._focusEditField(e);},!0),this._table.addEventListener("keydown",e=>{this._pressedEnterInEditField(e);}),this._table.addEventListener("click",e=>{this._clickedOnCell(e);}),this.htmlElement.addEventListener("keydown",e=>{this._containerKeydown(e);});}_focusEditField(e){this.selectedCell="TD"===e.target.tagName?e.target:e.target.closest("td");}focusCellOnSelectedCell(){this.selectedCell.childNodes[0].childNodes[0].focus();}_pressedEnterInEditField(e){e.target.classList.contains(o)&&("Enter"!==e.key||e.shiftKey||e.preventDefault());}_clickedOnCell(e){if(!e.target.classList.contains(s))return;e.target.querySelector("."+o).focus();}_containerKeydown(e){"Enter"===e.key&&e.ctrlKey&&this._containerEnterPressed(e);}_containerEnterPressed(e){this.insertRow(1).cells[0].click();}}const i="tc-editor",v="tc-table__inp";class w{constructor(e,l,a){this._table=new n;const _=this._resizeTable(e,l);this._fillTable(e,_),this._container=t("div",[i,a.styles&&a.styles.block],null,[this._table.htmlElement]);}get htmlElement(){return this._container}get table(){return this._table}_fillTable(e,l){if(void 0!==e.content)for(let a=0;a<l.rows&&a<e.content.length;a++)for(let _=0;_<l.cols&&_<e.content[a].length;_++){this._table.body.rows[a].cells[_].querySelector("."+v).innerHTML=e.content[a][_];}}_resizeTable(e,l){const a=Array.isArray(e.content),_=!!a&&e.content.length,t=a?e.content.length:void 0,r=_?e.content[0].length:void 0,o=Number.parseInt(l.rows),s=Number.parseInt(l.cols),c=!isNaN(o)&&o>0?o:void 0,d=!isNaN(s)&&s>0?s:void 0,h=t||c||1,n=r||d||1;for(let e=0;e<h;e++)this._table.insertRow();for(let e=0;e<n;e++)this._table.insertColumn();return {rows:h,cols:n}}}}])})); 
    } (bundle$8));

    var bundleExports$8 = bundle$8.exports;
    var Table = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$8);

    var dist = {exports: {}};

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,(function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(r,i,function(t){return e[t]}.bind(null,i));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){n.r(t),n.d(t,"StyleInlineTool",(function(){return c}));class r extends HTMLElement{}class i extends Error{constructor(...e){super(...e),this.name="EditorJSStyleError";}}var s,o,l=function(e,t,n,r,i){if("m"===r)throw new TypeError("Private method is not writable");if("a"===r&&!i)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!i:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return "a"===r?i.call(e,n):i?i.value=n:t.set(e,n),n},a=function(e,t,n,r){if("a"===n&&!r)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!r:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return "m"===n?r:"a"===n?r.call(e):r?r.value:t.get(e)};class c{constructor({api:e}){s.set(this,void 0),o.set(this,void 0),l(this,s,document.createElement("div"),"f"),l(this,o,e,"f");}static get isInline(){return !0}static get sanitize(){return {"editorjs-style":{class:!0,id:!0,style:!0}}}static get title(){return "Style"}static prepare(){customElements.get("editorjs-style")||customElements.define("editorjs-style",r);}get shortcut(){return "CMD+S"}checkState(){var e;a(this,s,"f").innerHTML="";const t=a(this,o,"f").selection.findParentTag("EDITORJS-STYLE");if(!t)return !1;a(this,s,"f").innerHTML=`\n      <div style="margin-bottom: 16px; margin-left: 16px; margin-right: 16px; ">\n        <div style="display: flex; align-items: center; justify-content: space-between; ">\n          <div>Style settings</div>\n\n          <button class="delete-button ${a(this,o,"f").styles.settingsButton}" type="button">\n            <svg class="icon" height="24" viewBox="0 0 24 24" width="24">\n              <path d="M0 0h24v24H0z" fill="none"/>\n              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>\n            </svg>\n          </button>\n        </div>\n\n        <label style="display: flex; align-items: center; justify-content: space-between; ">\n          <span>ID</span>\n\n          <input class="id-input ${a(this,o,"f").styles.input}" style="width: 80%; ">\n        </label>\n\n        <label style="display: flex; align-items: center; justify-content: space-between; ">\n          <span>Class</span>\n\n          <input class="class-input ${a(this,o,"f").styles.input}" style="width: 80%; ">\n        </label>\n\n        <label style="display: flex; align-items: center; justify-content: space-between; ">\n          <span>Style</span>\n\n          <textarea\n            class="style-textarea ${a(this,o,"f").styles.input}"\n            placeholder="background: #ffe7e8;"\n            style="resize: none; width: 80%; ">\n          </textarea>\n        </label>\n      </div>\n    `;const n=a(this,s,"f").querySelector(".delete-button"),r=a(this,s,"f").querySelector(".class-input"),l=a(this,s,"f").querySelector(".id-input"),c=a(this,s,"f").querySelector(".style-textarea");if(!(n&&r&&l&&c))throw new i;return n.addEventListener("click",()=>{const e=Array.from(t.childNodes).map(e=>e.cloneNode(!0));if(e.forEach(e=>{var n;return null===(n=t.parentNode)||void 0===n?void 0:n.insertBefore(e,t)}),t.remove(),0===e.length)return;const n=window.getSelection();if(!n)throw new i;n.removeAllRanges();const r=new Range;r.setStartBefore(e[0]),r.setEndAfter(e[e.length-1]),n.addRange(r),a(this,s,"f").innerHTML="",a(this,o,"f").tooltip.hide();}),a(this,o,"f").tooltip.onHover(n,"Delete style",{placement:"top"}),r.value=t.className,r.addEventListener("input",()=>t.setAttribute("class",r.value)),l.value=t.id,l.addEventListener("input",()=>t.id=l.value),c.value=null!==(e=t.getAttribute("style"))&&void 0!==e?e:"",c.addEventListener("keydown",e=>e.stopPropagation()),c.addEventListener("input",()=>t.setAttribute("style",c.value)),!0}clear(){a(this,s,"f").innerHTML="";}render(){const e=document.createElement("button");return e.classList.add(a(this,o,"f").styles.inlineToolButton),e.type="button",e.innerHTML='\n      <svg class="icon" height="24" viewBox="0 0 24 24" width="24">\n        <path d="M0 0h24v24H0z" fill="none"/>\n        <path d="M2.53 19.65l1.34.56v-9.03l-2.43 5.86c-.41 1.02.08 2.19 1.09 2.61zm19.5-3.7L17.07 3.98c-.31-.75-1.04-1.21-1.81-1.23-.26 0-.53.04-.79.15L7.1 5.95c-.75.31-1.21 1.03-1.23 1.8-.01.27.04.54.15.8l4.96 11.97c.31.76 1.05 1.22 1.83 1.23.26 0 .52-.05.77-.15l7.36-3.05c1.02-.42 1.51-1.59 1.09-2.6zM7.88 8.75c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2 11c0 1.1.9 2 2 2h1.45l-3.45-8.34v6.34z"/>\n      </svg>\n    ',e}renderActions(){return a(this,s,"f")}surround(e){const t=new r;e.surroundContents(t),a(this,o,"f").selection.expandToTag(t);}}s=new WeakMap,o=new WeakMap;}])})); 
    } (dist));

    var distExports = dist.exports;
    var EditorJSStyle = /*@__PURE__*/getDefaultExportFromCjs(distExports);

    var bundle$7 = {exports: {}};

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=5)}([function(e,t,n){var r=n(1);"string"==typeof r&&(r=[[e.i,r,""]]);var o={hmr:!0,transform:void 0,insertInto:void 0};n(3)(r,o);r.locals&&(e.exports=r.locals);},function(e,t,n){(e.exports=n(2)(!1)).push([e.i,".cdx-simple-image {}\n\n.cdx-simple-image .cdx-loader {\n  min-height: 200px;\n}\n\n.cdx-simple-image .cdx-input {\n  margin-top: 10px;\n}\n\n.cdx-simple-image img {\n  max-width: 100%;\n  vertical-align: bottom;\n}\n\n.cdx-simple-image__caption[contentEditable=true][data-placeholder]:empty::before {\n  position: absolute;\n  content: attr(data-placeholder);\n  color: #707684;\n  font-weight: normal;\n  opacity: 0;\n }\n\n.cdx-simple-image__caption[contentEditable=true][data-placeholder]:empty::before {\n  opacity: 1;\n}\n\n.cdx-simple-image__caption[contentEditable=true][data-placeholder]:empty:focus::before {\n  opacity: 0;\n}\n\n\n.cdx-simple-image__picture--with-background {\n  background: #eff2f5;\n  padding: 10px;\n}\n\n.cdx-simple-image__picture--with-background img {\n  display: block;\n  max-width: 60%;\n  margin: 0 auto;\n}\n\n.cdx-simple-image__picture--with-border {\n  border: 1px solid #e8e8eb;\n  padding: 1px;\n}\n\n.cdx-simple-image__picture--stretched img {\n  max-width: none;\n  width: 100%;\n}\n",""]);},function(e,t){e.exports=function(e){var t=[];return t.toString=function(){return this.map(function(t){var n=function(e,t){var n=e[1]||"",r=e[3];if(!r)return n;if(t&&"function"==typeof btoa){var o=(a=r,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(a))))+" */"),i=r.sources.map(function(e){return "/*# sourceURL="+r.sourceRoot+e+" */"});return [n].concat(i).concat([o]).join("\n")}var a;return [n].join("\n")}(t,e);return t[2]?"@media "+t[2]+"{"+n+"}":n}).join("")},t.i=function(e,n){"string"==typeof e&&(e=[[null,e,""]]);for(var r={},o=0;o<this.length;o++){var i=this[o][0];"number"==typeof i&&(r[i]=!0);}for(o=0;o<e.length;o++){var a=e[o];"number"==typeof a[0]&&r[a[0]]||(n&&!a[2]?a[2]=n:n&&(a[2]="("+a[2]+") and ("+n+")"),t.push(a));}},t};},function(e,t,n){var r,o,i={},a=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),s=function(e){var t={};return function(e){if("function"==typeof e)return e();if(void 0===t[e]){var n=function(e){return document.querySelector(e)}.call(this,e);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(e){n=null;}t[e]=n;}return t[e]}}(),c=null,l=0,u=[],d=n(4);function p(e,t){for(var n=0;n<e.length;n++){var r=e[n],o=i[r.id];if(o){o.refs++;for(var a=0;a<o.parts.length;a++)o.parts[a](r.parts[a]);for(;a<r.parts.length;a++)o.parts.push(b(r.parts[a],t));}else {var s=[];for(a=0;a<r.parts.length;a++)s.push(b(r.parts[a],t));i[r.id]={id:r.id,refs:1,parts:s};}}}function f(e,t){for(var n=[],r={},o=0;o<e.length;o++){var i=e[o],a=t.base?i[0]+t.base:i[0],s={css:i[1],media:i[2],sourceMap:i[3]};r[a]?r[a].parts.push(s):n.push(r[a]={id:a,parts:[s]});}return n}function h(e,t){var n=s(e.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=u[u.length-1];if("top"===e.insertAt)r?r.nextSibling?n.insertBefore(t,r.nextSibling):n.appendChild(t):n.insertBefore(t,n.firstChild),u.push(t);else if("bottom"===e.insertAt)n.appendChild(t);else {if("object"!=typeof e.insertAt||!e.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=s(e.insertInto+" "+e.insertAt.before);n.insertBefore(t,o);}}function m(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);var t=u.indexOf(e);t>=0&&u.splice(t,1);}function g(e){var t=document.createElement("style");return void 0===e.attrs.type&&(e.attrs.type="text/css"),v(t,e.attrs),h(e,t),t}function v(e,t){Object.keys(t).forEach(function(n){e.setAttribute(n,t[n]);});}function b(e,t){var n,r,o,i;if(t.transform&&e.css){if(!(i=t.transform(e.css)))return function(){};e.css=i;}if(t.singleton){var a=l++;n=c||(c=g(t)),r=w.bind(null,n,a,!1),o=w.bind(null,n,a,!0);}else e.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(e){var t=document.createElement("link");return void 0===e.attrs.type&&(e.attrs.type="text/css"),e.attrs.rel="stylesheet",v(t,e.attrs),h(e,t),t}(t),r=function(e,t,n){var r=n.css,o=n.sourceMap,i=void 0===t.convertToAbsoluteUrls&&o;(t.convertToAbsoluteUrls||i)&&(r=d(r));o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var a=new Blob([r],{type:"text/css"}),s=e.href;e.href=URL.createObjectURL(a),s&&URL.revokeObjectURL(s);}.bind(null,n,t),o=function(){m(n),n.href&&URL.revokeObjectURL(n.href);}):(n=g(t),r=function(e,t){var n=t.css,r=t.media;r&&e.setAttribute("media",r);if(e.styleSheet)e.styleSheet.cssText=n;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(n));}}.bind(null,n),o=function(){m(n);});return r(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;r(e=t);}else o();}}e.exports=function(e,t){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(t=t||{}).attrs="object"==typeof t.attrs?t.attrs:{},t.singleton||"boolean"==typeof t.singleton||(t.singleton=a()),t.insertInto||(t.insertInto="head"),t.insertAt||(t.insertAt="bottom");var n=f(e,t);return p(n,t),function(e){for(var r=[],o=0;o<n.length;o++){var a=n[o];(s=i[a.id]).refs--,r.push(s);}e&&p(f(e,t),t);for(o=0;o<r.length;o++){var s;if(0===(s=r[o]).refs){for(var c=0;c<s.parts.length;c++)s.parts[c]();delete i[s.id];}}}};var k,y=(k=[],function(e,t){return k[e]=t,k.filter(Boolean).join("\n")});function w(e,t,n,r){var o=n?"":r.css;if(e.styleSheet)e.styleSheet.cssText=y(t,o);else {var i=document.createTextNode(o),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(i,a[t]):e.appendChild(i);}}},function(e,t){e.exports=function(e){var t="undefined"!=typeof window&&window.location;if(!t)throw new Error("fixUrls requires window.location");if(!e||"string"!=typeof e)return e;var n=t.protocol+"//"+t.host,r=n+t.pathname.replace(/\/[^\/]*$/,"/");return e.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,function(e,t){var o,i=t.trim().replace(/^"(.*)"$/,function(e,t){return t}).replace(/^'(.*)'$/,function(e,t){return t});return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(i)?e:(o=0===i.indexOf("//")?i:0===i.indexOf("/")?n+i:r+i.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")})};},function(e,t,n){n.r(t);n(0);const r='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19V19C9.13623 19 8.20435 19 7.46927 18.6955C6.48915 18.2895 5.71046 17.5108 5.30448 16.5307C5 15.7956 5 14.8638 5 13V12C5 9.19108 5 7.78661 5.67412 6.77772C5.96596 6.34096 6.34096 5.96596 6.77772 5.67412C7.78661 5 9.19108 5 12 5H13.5C14.8956 5 15.5933 5 16.1611 5.17224C17.4395 5.56004 18.44 6.56046 18.8278 7.83886C19 8.40666 19 9.10444 19 10.5V10.5"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 13V16M16 19V16M19 16H16M16 16H13"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.5 17.5L17.5 6.5"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.9919 10.5H19.0015"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.9919 19H11.0015"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13L13 5"/></svg>',o='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.9919 9.5H19.0015"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.5 5H14.5096"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M14.625 5H15C17.2091 5 19 6.79086 19 9V9.375"/><path stroke="currentColor" stroke-width="2" d="M9.375 5L9 5C6.79086 5 5 6.79086 5 9V9.375"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.3725 5H9.38207"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 9.5H5.00957"/><path stroke="currentColor" stroke-width="2" d="M9.375 19H9C6.79086 19 5 17.2091 5 15V14.625"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.3725 19H9.38207"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 14.55H5.00957"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 13V16M16 19V16M19 16H16M16 16H13"/></svg>',i='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9L20 12L17 15"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 12H20"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 9L4 12L7 15"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12H10"/></svg>';function a(e){return function(e){if(Array.isArray(e)){for(var t=0,n=new Array(e.length);t<e.length;t++)n[t]=e[t];return n}}(e)||function(e){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e))return Array.from(e)}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}function s(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function c(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}n.d(t,"default",function(){return l});var l=function(){function e(t){var n=t.data,a=(t.config,t.api),s=t.readOnly;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.api=a,this.readOnly=s,this.blockIndex=this.api.blocks.getCurrentBlockIndex()+1,this.CSS={baseClass:this.api.styles.block,loading:this.api.styles.loader,input:this.api.styles.input,wrapper:"cdx-simple-image",imageHolder:"cdx-simple-image__picture",caption:"cdx-simple-image__caption"},this.nodes={wrapper:null,imageHolder:null,image:null,caption:null},this.data={url:n.url||"",caption:n.caption||"",withBorder:void 0!==n.withBorder&&n.withBorder,withBackground:void 0!==n.withBackground&&n.withBackground,stretched:void 0!==n.stretched&&n.stretched},this.tunes=[{name:"withBorder",label:"Add Border",icon:o},{name:"stretched",label:"Stretch Image",icon:i},{name:"withBackground",label:"Add Background",icon:r}];}var t,n,l;return t=e,l=[{key:"sanitize",get:function(){return {url:{},withBorder:{},withBackground:{},stretched:{},caption:{br:!0}}}},{key:"isReadOnlySupported",get:function(){return !0}},{key:"pasteConfig",get:function(){return {patterns:{image:/https?:\/\/\S+\.(gif|jpe?g|tiff|png|webp)$/i},tags:[{img:{src:!0}}],files:{mimeTypes:["image/*"]}}}}],(n=[{key:"render",value:function(){var e=this,t=this._make("div",[this.CSS.baseClass,this.CSS.wrapper]),n=this._make("div",this.CSS.loading),r=this._make("div",this.CSS.imageHolder),o=this._make("img"),i=this._make("div",[this.CSS.input,this.CSS.caption],{contentEditable:!this.readOnly,innerHTML:this.data.caption||""});return i.dataset.placeholder="Enter a caption",t.appendChild(n),this.data.url&&(o.src=this.data.url),o.onload=function(){t.classList.remove(e.CSS.loading),r.appendChild(o),t.appendChild(r),t.appendChild(i),n.remove(),e._acceptTuneView();},o.onerror=function(e){console.log("Failed to load an image",e);},this.nodes.imageHolder=r,this.nodes.wrapper=t,this.nodes.image=o,this.nodes.caption=i,t}},{key:"save",value:function(e){var t=e.querySelector("img"),n=e.querySelector("."+this.CSS.input);return t?Object.assign(this.data,{url:t.src,caption:n.innerHTML}):this.data}},{key:"onDropHandler",value:function(e){var t=new FileReader;return t.readAsDataURL(e),new Promise(function(n){t.onload=function(t){n({url:t.target.result,caption:e.name});};})}},{key:"onPaste",value:function(e){var t=this;switch(e.type){case"tag":var n=e.detail.data;this.data={url:n.src};break;case"pattern":var r=e.detail.data;this.data={url:r};break;case"file":var o=e.detail.file;this.onDropHandler(o).then(function(e){t.data=e;});}}},{key:"renderSettings",value:function(){var e=this;return this.tunes.map(function(t){return function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{},r=Object.keys(n);"function"==typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter(function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),r.forEach(function(t){s(e,t,n[t]);});}return e}({},t,{label:e.api.i18n.t(t.label),toggle:!0,onActivate:function(){return e._toggleTune(t.name)},isActive:!!e.data[t.name]})})}},{key:"_make",value:function(e){var t,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},o=document.createElement(e);Array.isArray(n)?(t=o.classList).add.apply(t,a(n)):n&&o.classList.add(n);for(var i in r)o[i]=r[i];return o}},{key:"_toggleTune",value:function(e){this.data[e]=!this.data[e],this._acceptTuneView();}},{key:"_acceptTuneView",value:function(){var e=this;this.tunes.forEach(function(t){e.nodes.imageHolder.classList.toggle(e.CSS.imageHolder+"--"+t.name.replace(/([A-Z])/g,function(e){return "-".concat(e[0].toLowerCase())}),!!e.data[t.name]),"stretched"===t.name&&e.api.blocks.stretchBlock(e.blockIndex,!!e.data.stretched);});}},{key:"data",get:function(){return this._data},set:function(e){this._data=Object.assign({},this.data,e),this.nodes.image&&(this.nodes.image.src=this.data.url),this.nodes.caption&&(this.nodes.caption.innerHTML=this.data.caption);}}])&&c(t.prototype,n),l&&c(t,l),e}();}]).default}); 
    } (bundle$7));

    var bundleExports$7 = bundle$7.exports;
    var SimpleImage = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$7);

    var bundle$6 = {exports: {}};

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,(function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=5)}([function(e,t,n){var r=n(1);"string"==typeof r&&(r=[[e.i,r,""]]);var o={hmr:!0,transform:void 0,insertInto:void 0};n(3)(r,o);r.locals&&(e.exports=r.locals);},function(e,t,n){(e.exports=n(2)(!1)).push([e.i,".ce-rawtool__textarea {\n  min-height: 200px;\n  resize: vertical;\n  border-radius: 8px;\n  border: 0;\n  background-color: #1e2128;\n  font-family: Menlo, Monaco, Consolas, Courier New, monospace;\n  font-size: 12px;\n  line-height: 1.6;\n  letter-spacing: -0.2px;\n  color: #a1a7b6;\n  overscroll-behavior: contain;\n}\n",""]);},function(e,t){e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=function(e,t){var n=e[1]||"",r=e[3];if(!r)return n;if(t&&"function"==typeof btoa){var o=(a=r,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(a))))+" */"),i=r.sources.map((function(e){return "/*# sourceURL="+r.sourceRoot+e+" */"}));return [n].concat(i).concat([o]).join("\n")}var a;return [n].join("\n")}(t,e);return t[2]?"@media "+t[2]+"{"+n+"}":n})).join("")},t.i=function(e,n){"string"==typeof e&&(e=[[null,e,""]]);for(var r={},o=0;o<this.length;o++){var i=this[o][0];"number"==typeof i&&(r[i]=!0);}for(o=0;o<e.length;o++){var a=e[o];"number"==typeof a[0]&&r[a[0]]||(n&&!a[2]?a[2]=n:n&&(a[2]="("+a[2]+") and ("+n+")"),t.push(a));}},t};},function(e,t,n){var r,o,i={},a=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),s=function(e){return document.querySelector(e)},u=function(e){var t={};return function(e){if("function"==typeof e)return e();if(void 0===t[e]){var n=s.call(this,e);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(e){n=null;}t[e]=n;}return t[e]}}(),c=null,l=0,f=[],p=n(4);function d(e,t){for(var n=0;n<e.length;n++){var r=e[n],o=i[r.id];if(o){o.refs++;for(var a=0;a<o.parts.length;a++)o.parts[a](r.parts[a]);for(;a<r.parts.length;a++)o.parts.push(g(r.parts[a],t));}else {var s=[];for(a=0;a<r.parts.length;a++)s.push(g(r.parts[a],t));i[r.id]={id:r.id,refs:1,parts:s};}}}function h(e,t){for(var n=[],r={},o=0;o<e.length;o++){var i=e[o],a=t.base?i[0]+t.base:i[0],s={css:i[1],media:i[2],sourceMap:i[3]};r[a]?r[a].parts.push(s):n.push(r[a]={id:a,parts:[s]});}return n}function v(e,t){var n=u(e.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=f[f.length-1];if("top"===e.insertAt)r?r.nextSibling?n.insertBefore(t,r.nextSibling):n.appendChild(t):n.insertBefore(t,n.firstChild),f.push(t);else if("bottom"===e.insertAt)n.appendChild(t);else {if("object"!=typeof e.insertAt||!e.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=u(e.insertInto+" "+e.insertAt.before);n.insertBefore(t,o);}}function b(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);var t=f.indexOf(e);t>=0&&f.splice(t,1);}function y(e){var t=document.createElement("style");return void 0===e.attrs.type&&(e.attrs.type="text/css"),m(t,e.attrs),v(e,t),t}function m(e,t){Object.keys(t).forEach((function(n){e.setAttribute(n,t[n]);}));}function g(e,t){var n,r,o,i;if(t.transform&&e.css){if(!(i=t.transform(e.css)))return function(){};e.css=i;}if(t.singleton){var a=l++;n=c||(c=y(t)),r=L.bind(null,n,a,!1),o=L.bind(null,n,a,!0);}else e.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(e){var t=document.createElement("link");return void 0===e.attrs.type&&(e.attrs.type="text/css"),e.attrs.rel="stylesheet",m(t,e.attrs),v(e,t),t}(t),r=j.bind(null,n,t),o=function(){b(n),n.href&&URL.revokeObjectURL(n.href);}):(n=y(t),r=C.bind(null,n),o=function(){b(n);});return r(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;r(e=t);}else o();}}e.exports=function(e,t){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(t=t||{}).attrs="object"==typeof t.attrs?t.attrs:{},t.singleton||"boolean"==typeof t.singleton||(t.singleton=a()),t.insertInto||(t.insertInto="head"),t.insertAt||(t.insertAt="bottom");var n=h(e,t);return d(n,t),function(e){for(var r=[],o=0;o<n.length;o++){var a=n[o];(s=i[a.id]).refs--,r.push(s);}e&&d(h(e,t),t);for(o=0;o<r.length;o++){var s;if(0===(s=r[o]).refs){for(var u=0;u<s.parts.length;u++)s.parts[u]();delete i[s.id];}}}};var x,w=(x=[],function(e,t){return x[e]=t,x.filter(Boolean).join("\n")});function L(e,t,n,r){var o=n?"":r.css;if(e.styleSheet)e.styleSheet.cssText=w(t,o);else {var i=document.createTextNode(o),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(i,a[t]):e.appendChild(i);}}function C(e,t){var n=t.css,r=t.media;if(r&&e.setAttribute("media",r),e.styleSheet)e.styleSheet.cssText=n;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(n));}}function j(e,t,n){var r=n.css,o=n.sourceMap,i=void 0===t.convertToAbsoluteUrls&&o;(t.convertToAbsoluteUrls||i)&&(r=p(r)),o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var a=new Blob([r],{type:"text/css"}),s=e.href;e.href=URL.createObjectURL(a),s&&URL.revokeObjectURL(s);}},function(e,t){e.exports=function(e){var t="undefined"!=typeof window&&window.location;if(!t)throw new Error("fixUrls requires window.location");if(!e||"string"!=typeof e)return e;var n=t.protocol+"//"+t.host,r=n+t.pathname.replace(/\/[^\/]*$/,"/");return e.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,(function(e,t){var o,i=t.trim().replace(/^"(.*)"$/,(function(e,t){return t})).replace(/^'(.*)'$/,(function(e,t){return t}));return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(i)?e:(o=0===i.indexOf("//")?i:0===i.indexOf("/")?n+i:r+i.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")}))};},function(e,t,n){n.r(t),n.d(t,"default",(function(){return i}));n(0);function r(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}function o(e,t,n){return t&&r(e.prototype,t),n&&r(e,n),e}
    	/**
    	 * Raw HTML Tool for CodeX Editor
    	 *
    	 * @author CodeX (team@codex.so)
    	 * @copyright CodeX 2018
    	 * @license The MIT License (MIT)
    	 */var i=function(){function e(t){var n=t.data,r=t.config,o=t.api,i=t.readOnly;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.api=o,this.readOnly=i,this.placeholder=r.placeholder||e.DEFAULT_PLACEHOLDER,this.CSS={baseClass:this.api.styles.block,input:this.api.styles.input,wrapper:"ce-rawtool",textarea:"ce-rawtool__textarea"},this.data={html:n.html||""},this.textarea=null,this.resizeDebounce=null;}return o(e,null,[{key:"isReadOnlySupported",get:function(){return !0}},{key:"displayInToolbox",get:function(){return !0}},{key:"enableLineBreaks",get:function(){return !0}},{key:"toolbox",get:function(){return {icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.6954 5C17.912 5 18.8468 6.07716 18.6755 7.28165L17.426 16.0659C17.3183 16.8229 16.7885 17.4522 16.061 17.6873L12.6151 18.8012C12.2152 18.9304 11.7848 18.9304 11.3849 18.8012L7.93898 17.6873C7.21148 17.4522 6.6817 16.8229 6.57403 16.0659L5.32454 7.28165C5.15322 6.07716 6.088 5 7.30461 5H16.6954Z"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 8.4H9L9.42857 11.7939H14.5714L14.3571 13.2788L14.1429 14.7636L12 15.4L9.85714 14.7636L9.77143 14.3394"/></svg>',title:"Raw HTML"}}}]),o(e,[{key:"render",value:function(){var e=this,t=document.createElement("div");return this.textarea=document.createElement("textarea"),t.classList.add(this.CSS.baseClass,this.CSS.wrapper),this.textarea.classList.add(this.CSS.textarea,this.CSS.input),this.textarea.textContent=this.data.html,this.textarea.placeholder=this.placeholder,this.readOnly?this.textarea.disabled=!0:this.textarea.addEventListener("input",(function(){e.onInput();})),t.appendChild(this.textarea),setTimeout((function(){e.resize();}),100),t}},{key:"save",value:function(e){return {html:e.querySelector("textarea").value}}},{key:"onInput",value:function(){var e=this;this.resizeDebounce&&clearTimeout(this.resizeDebounce),this.resizeDebounce=setTimeout((function(){e.resize();}),200);}},{key:"resize",value:function(){this.textarea.style.height="auto",this.textarea.style.height=this.textarea.scrollHeight+"px";}}],[{key:"DEFAULT_PLACEHOLDER",get:function(){return "Enter HTML code"}},{key:"sanitize",get:function(){return {html:!0}}}]),e}();}]).default})); 
    } (bundle$6));

    var bundleExports$6 = bundle$6.exports;
    var RawTool = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$6);

    var bundle$5 = {exports: {}};

    (function (module, exports) {
    	!function(t,e){module.exports=e();}(window,(function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r});},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(r,o,function(e){return t[e]}.bind(null,o));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/",n(n.s=18)}([function(t,e,n){t.exports=n(11);},function(t,e){function n(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r);}}t.exports=function(t,e,r){return e&&n(t.prototype,e),r&&n(t,r),t};},function(t,e){t.exports=function(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,r=new Array(e);n<e;n++)r[n]=t[n];return r};},function(t,e,n){var r=n(7),o=n(8),i=n(9),a=n(10);t.exports=function(t){return r(t)||o(t)||i(t)||a()};},function(t,e){function n(t,e,n,r,o,i,a){try{var s=t[i](a),c=s.value;}catch(t){return void n(t)}s.done?e(c):Promise.resolve(c).then(r,o);}t.exports=function(t){return function(){var e=this,r=arguments;return new Promise((function(o,i){var a=t.apply(e,r);function s(t){n(a,o,i,s,c,"next",t);}function c(t){n(a,o,i,s,c,"throw",t);}s(void 0);}))}};},function(t,e){t.exports=function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")};},function(t,e,n){t.exports=function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r});},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(r,o,function(e){return t[e]}.bind(null,o));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=3)}([function(t,e){var n;n=function(){return this}();try{n=n||new Function("return this")();}catch(t){"object"==typeof window&&(n=window);}t.exports=n;},function(t,e,n){(function(t){var r=n(2),o=setTimeout;function i(){}function a(t){if(!(this instanceof a))throw new TypeError("Promises must be constructed via new");if("function"!=typeof t)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=void 0,this._deferreds=[],d(t,this);}function s(t,e){for(;3===t._state;)t=t._value;0!==t._state?(t._handled=!0,a._immediateFn((function(){var n=1===t._state?e.onFulfilled:e.onRejected;if(null!==n){var r;try{r=n(t._value);}catch(t){return void u(e.promise,t)}c(e.promise,r);}else (1===t._state?c:u)(e.promise,t._value);}))):t._deferreds.push(e);}function c(t,e){try{if(e===t)throw new TypeError("A promise cannot be resolved with itself.");if(e&&("object"==typeof e||"function"==typeof e)){var n=e.then;if(e instanceof a)return t._state=3,t._value=e,void l(t);if("function"==typeof n)return void d((r=n,o=e,function(){r.apply(o,arguments);}),t)}t._state=1,t._value=e,l(t);}catch(e){u(t,e);}var r,o;}function u(t,e){t._state=2,t._value=e,l(t);}function l(t){2===t._state&&0===t._deferreds.length&&a._immediateFn((function(){t._handled||a._unhandledRejectionFn(t._value);}));for(var e=0,n=t._deferreds.length;e<n;e++)s(t,t._deferreds[e]);t._deferreds=null;}function f(t,e,n){this.onFulfilled="function"==typeof t?t:null,this.onRejected="function"==typeof e?e:null,this.promise=n;}function d(t,e){var n=!1;try{t((function(t){n||(n=!0,c(e,t));}),(function(t){n||(n=!0,u(e,t));}));}catch(t){if(n)return;n=!0,u(e,t);}}a.prototype.catch=function(t){return this.then(null,t)},a.prototype.then=function(t,e){var n=new this.constructor(i);return s(this,new f(t,e,n)),n},a.prototype.finally=r.a,a.all=function(t){return new a((function(e,n){if(!t||void 0===t.length)throw new TypeError("Promise.all accepts an array");var r=Array.prototype.slice.call(t);if(0===r.length)return e([]);var o=r.length;function i(t,a){try{if(a&&("object"==typeof a||"function"==typeof a)){var s=a.then;if("function"==typeof s)return void s.call(a,(function(e){i(t,e);}),n)}r[t]=a,0==--o&&e(r);}catch(t){n(t);}}for(var a=0;a<r.length;a++)i(a,r[a]);}))},a.resolve=function(t){return t&&"object"==typeof t&&t.constructor===a?t:new a((function(e){e(t);}))},a.reject=function(t){return new a((function(e,n){n(t);}))},a.race=function(t){return new a((function(e,n){for(var r=0,o=t.length;r<o;r++)t[r].then(e,n);}))},a._immediateFn="function"==typeof t&&function(e){t(e);}||function(t){o(t,0);},a._unhandledRejectionFn=function(t){"undefined"!=typeof console&&console&&console.warn("Possible Unhandled Promise Rejection:",t);},e.a=a;}).call(this,n(5).setImmediate);},function(t,e,n){e.a=function(t){var e=this.constructor;return this.then((function(n){return e.resolve(t()).then((function(){return n}))}),(function(n){return e.resolve(t()).then((function(){return e.reject(n)}))}))};},function(t,e,n){function r(t){return (r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}n(4);var o,i,a,s,c,u,l=n(8),f=(i=function(t){return new Promise((function(e,n){t=s(t),t=c(t);var r=window.XMLHttpRequest?new window.XMLHttpRequest:new window.ActiveXObject("Microsoft.XMLHTTP");r.open(t.method,t.url),r.setRequestHeader("X-Requested-With","XMLHttpRequest"),Object.keys(t.headers).forEach((function(e){var n=t.headers[e];r.setRequestHeader(e,n);}));var o=t.ratio;r.upload.addEventListener("progress",(function(e){var n=Math.round(e.loaded/e.total*100),r=Math.ceil(n*o/100);t.progress(r);}),!1),r.addEventListener("progress",(function(e){var n=Math.round(e.loaded/e.total*100),r=Math.ceil(n*(100-o)/100)+o;t.progress(r);}),!1),r.onreadystatechange=function(){if(4===r.readyState){var t=r.response;try{t=JSON.parse(t);}catch(t){}var o=l.parseHeaders(r.getAllResponseHeaders()),i={body:t,code:r.status,headers:o};200===r.status?e(i):n(i);}},r.send(t.data);}))},a=function(t){return t.method="POST",i(t)},s=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(t.url&&"string"!=typeof t.url)throw new Error("Url must be a string");if(t.url=t.url||"",t.method&&"string"!=typeof t.method)throw new Error("`method` must be a string or null");if(t.method=t.method?t.method.toUpperCase():"GET",t.headers&&"object"!==r(t.headers))throw new Error("`headers` must be an object or null");if(t.headers=t.headers||{},t.type&&("string"!=typeof t.type||!Object.values(o).includes(t.type)))throw new Error("`type` must be taken from module's «contentType» library");if(t.progress&&"function"!=typeof t.progress)throw new Error("`progress` must be a function or null");if(t.progress=t.progress||function(t){},t.beforeSend=t.beforeSend||function(t){},t.ratio&&"number"!=typeof t.ratio)throw new Error("`ratio` must be a number");if(t.ratio<0||t.ratio>100)throw new Error("`ratio` must be in a 0-100 interval");if(t.ratio=t.ratio||90,t.accept&&"string"!=typeof t.accept)throw new Error("`accept` must be a string with a list of allowed mime-types");if(t.accept=t.accept||"*/*",t.multiple&&"boolean"!=typeof t.multiple)throw new Error("`multiple` must be a true or false");if(t.multiple=t.multiple||!1,t.fieldName&&"string"!=typeof t.fieldName)throw new Error("`fieldName` must be a string");return t.fieldName=t.fieldName||"files",t},c=function(t){switch(t.method){case"GET":var e=u(t.data,o.URLENCODED);delete t.data,t.url=/\?/.test(t.url)?t.url+"&"+e:t.url+"?"+e;break;case"POST":case"PUT":case"DELETE":case"UPDATE":var n=function(){return (arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}).type||o.JSON}(t);(l.isFormData(t.data)||l.isFormElement(t.data))&&(n=o.FORM),t.data=u(t.data,n),n!==f.contentType.FORM&&(t.headers["content-type"]=n);}return t},u=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};switch(arguments.length>1?arguments[1]:void 0){case o.URLENCODED:return l.urlEncode(t);case o.JSON:return l.jsonEncode(t);case o.FORM:return l.formEncode(t);default:return t}},{contentType:o={URLENCODED:"application/x-www-form-urlencoded; charset=utf-8",FORM:"multipart/form-data",JSON:"application/json; charset=utf-8"},request:i,get:function(t){return t.method="GET",i(t)},post:a,transport:function(t){return t=s(t),l.selectFiles(t).then((function(e){for(var n=new FormData,r=0;r<e.length;r++)n.append(t.fieldName,e[r],e[r].name);return l.isObject(t.data)&&Object.keys(t.data).forEach((function(e){var r=t.data[e];n.append(e,r);})),t.beforeSend&&t.beforeSend(e),t.data=n,a(t)}))},selectFiles:function(t){return delete(t=s(t)).beforeSend,l.selectFiles(t)}});t.exports=f;},function(t,e,n){n.r(e);var r=n(1);window.Promise=window.Promise||r.a;},function(t,e,n){(function(t){var r=void 0!==t&&t||"undefined"!=typeof self&&self||window,o=Function.prototype.apply;function i(t,e){this._id=t,this._clearFn=e;}e.setTimeout=function(){return new i(o.call(setTimeout,r,arguments),clearTimeout)},e.setInterval=function(){return new i(o.call(setInterval,r,arguments),clearInterval)},e.clearTimeout=e.clearInterval=function(t){t&&t.close();},i.prototype.unref=i.prototype.ref=function(){},i.prototype.close=function(){this._clearFn.call(r,this._id);},e.enroll=function(t,e){clearTimeout(t._idleTimeoutId),t._idleTimeout=e;},e.unenroll=function(t){clearTimeout(t._idleTimeoutId),t._idleTimeout=-1;},e._unrefActive=e.active=function(t){clearTimeout(t._idleTimeoutId);var e=t._idleTimeout;e>=0&&(t._idleTimeoutId=setTimeout((function(){t._onTimeout&&t._onTimeout();}),e));},n(6),e.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==t&&t.setImmediate||this&&this.setImmediate,e.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==t&&t.clearImmediate||this&&this.clearImmediate;}).call(this,n(0));},function(t,e,n){(function(t,e){!function(t,n){if(!t.setImmediate){var r,o,i,a,s,c=1,u={},l=!1,f=t.document,d=Object.getPrototypeOf&&Object.getPrototypeOf(t);d=d&&d.setTimeout?d:t,"[object process]"==={}.toString.call(t.process)?r=function(t){e.nextTick((function(){p(t);}));}:function(){if(t.postMessage&&!t.importScripts){var e=!0,n=t.onmessage;return t.onmessage=function(){e=!1;},t.postMessage("","*"),t.onmessage=n,e}}()?(a="setImmediate$"+Math.random()+"$",s=function(e){e.source===t&&"string"==typeof e.data&&0===e.data.indexOf(a)&&p(+e.data.slice(a.length));},t.addEventListener?t.addEventListener("message",s,!1):t.attachEvent("onmessage",s),r=function(e){t.postMessage(a+e,"*");}):t.MessageChannel?((i=new MessageChannel).port1.onmessage=function(t){p(t.data);},r=function(t){i.port2.postMessage(t);}):f&&"onreadystatechange"in f.createElement("script")?(o=f.documentElement,r=function(t){var e=f.createElement("script");e.onreadystatechange=function(){p(t),e.onreadystatechange=null,o.removeChild(e),e=null;},o.appendChild(e);}):r=function(t){setTimeout(p,0,t);},d.setImmediate=function(t){"function"!=typeof t&&(t=new Function(""+t));for(var e=new Array(arguments.length-1),n=0;n<e.length;n++)e[n]=arguments[n+1];var o={callback:t,args:e};return u[c]=o,r(c),c++},d.clearImmediate=h;}function h(t){delete u[t];}function p(t){if(l)setTimeout(p,0,t);else {var e=u[t];if(e){l=!0;try{!function(t){var e=t.callback,n=t.args;switch(n.length){case 0:e();break;case 1:e(n[0]);break;case 2:e(n[0],n[1]);break;case 3:e(n[0],n[1],n[2]);break;default:e.apply(void 0,n);}}(e);}finally{h(t),l=!1;}}}}}("undefined"==typeof self?void 0===t?this:t:self);}).call(this,n(0),n(7));},function(t,e){var n,r,o=t.exports={};function i(){throw new Error("setTimeout has not been defined")}function a(){throw new Error("clearTimeout has not been defined")}function s(t){if(n===setTimeout)return setTimeout(t,0);if((n===i||!n)&&setTimeout)return n=setTimeout,setTimeout(t,0);try{return n(t,0)}catch(e){try{return n.call(null,t,0)}catch(e){return n.call(this,t,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:i;}catch(t){n=i;}try{r="function"==typeof clearTimeout?clearTimeout:a;}catch(t){r=a;}}();var c,u=[],l=!1,f=-1;function d(){l&&c&&(l=!1,c.length?u=c.concat(u):f=-1,u.length&&h());}function h(){if(!l){var t=s(d);l=!0;for(var e=u.length;e;){for(c=u,u=[];++f<e;)c&&c[f].run();f=-1,e=u.length;}c=null,l=!1,function(t){if(r===clearTimeout)return clearTimeout(t);if((r===a||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(t);try{r(t);}catch(e){try{return r.call(null,t)}catch(e){return r.call(this,t)}}}(t);}}function p(t,e){this.fun=t,this.array=e;}function m(){}o.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)e[n-1]=arguments[n];u.push(new p(t,e)),1!==u.length||l||s(h);},p.prototype.run=function(){this.fun.apply(null,this.array);},o.title="browser",o.browser=!0,o.env={},o.argv=[],o.version="",o.versions={},o.on=m,o.addListener=m,o.once=m,o.off=m,o.removeListener=m,o.removeAllListeners=m,o.emit=m,o.prependListener=m,o.prependOnceListener=m,o.listeners=function(t){return []},o.binding=function(t){throw new Error("process.binding is not supported")},o.cwd=function(){return "/"},o.chdir=function(t){throw new Error("process.chdir is not supported")},o.umask=function(){return 0};},function(t,e,n){function r(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r);}}var o=n(9);t.exports=function(){function t(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t);}var e,n;return e=t,(n=[{key:"urlEncode",value:function(t){return o(t)}},{key:"jsonEncode",value:function(t){return JSON.stringify(t)}},{key:"formEncode",value:function(t){if(this.isFormData(t))return t;if(this.isFormElement(t))return new FormData(t);if(this.isObject(t)){var e=new FormData;return Object.keys(t).forEach((function(n){var r=t[n];e.append(n,r);})),e}throw new Error("`data` must be an instance of Object, FormData or <FORM> HTMLElement")}},{key:"isObject",value:function(t){return "[object Object]"===Object.prototype.toString.call(t)}},{key:"isFormData",value:function(t){return t instanceof FormData}},{key:"isFormElement",value:function(t){return t instanceof HTMLFormElement}},{key:"selectFiles",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return new Promise((function(e,n){var r=document.createElement("INPUT");r.type="file",t.multiple&&r.setAttribute("multiple","multiple"),t.accept&&r.setAttribute("accept",t.accept),r.style.display="none",document.body.appendChild(r),r.addEventListener("change",(function(t){var n=t.target.files;e(n),document.body.removeChild(r);}),!1),r.click();}))}},{key:"parseHeaders",value:function(t){var e=t.trim().split(/[\r\n]+/),n={};return e.forEach((function(t){var e=t.split(": "),r=e.shift(),o=e.join(": ");r&&(n[r]=o);})),n}}])&&r(e,n),t}();},function(t,e){var n=function(t){return encodeURIComponent(t).replace(/[!'()*]/g,escape).replace(/%20/g,"+")},r=function(t,e,o,i){return e=e||null,o=o||"&",i=i||null,t?function(t){for(var e=new Array,n=0;n<t.length;n++)t[n]&&e.push(t[n]);return e}(Object.keys(t).map((function(a){var s,c,u=a;if(i&&(u=i+"["+u+"]"),"object"==typeof t[a]&&null!==t[a])s=r(t[a],null,o,u);else {e&&(c=u,u=!isNaN(parseFloat(c))&&isFinite(c)?e+Number(u):u);var l=t[a];l=(l=0===(l=!1===(l=!0===l?"1":l)?"0":l)?"0":l)||"",s=n(u)+"="+n(l);}return s}))).join(o).replace(/[!'()*]/g,""):""};t.exports=r;}]);},function(t,e,n){var r=n(2);t.exports=function(t){if(Array.isArray(t))return r(t)};},function(t,e){t.exports=function(t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t))return Array.from(t)};},function(t,e,n){var r=n(2);t.exports=function(t,e){if(t){if("string"==typeof t)return r(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return "Object"===n&&t.constructor&&(n=t.constructor.name),"Map"===n||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?r(t,e):void 0}};},function(t,e){t.exports=function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")};},function(t,e,n){var r=function(t){var e=Object.prototype,n=e.hasOwnProperty,r="function"==typeof Symbol?Symbol:{},o=r.iterator||"@@iterator",i=r.asyncIterator||"@@asyncIterator",a=r.toStringTag||"@@toStringTag";function s(t,e,n,r){var o=e&&e.prototype instanceof l?e:l,i=Object.create(o.prototype),a=new _(r||[]);return i._invoke=function(t,e,n){var r="suspendedStart";return function(o,i){if("executing"===r)throw new Error("Generator is already running");if("completed"===r){if("throw"===o)throw i;return x()}for(n.method=o,n.arg=i;;){var a=n.delegate;if(a){var s=b(a,n);if(s){if(s===u)continue;return s}}if("next"===n.method)n.sent=n._sent=n.arg;else if("throw"===n.method){if("suspendedStart"===r)throw r="completed",n.arg;n.dispatchException(n.arg);}else "return"===n.method&&n.abrupt("return",n.arg);r="executing";var l=c(t,e,n);if("normal"===l.type){if(r=n.done?"completed":"suspendedYield",l.arg===u)continue;return {value:l.arg,done:n.done}}"throw"===l.type&&(r="completed",n.method="throw",n.arg=l.arg);}}}(t,n,a),i}function c(t,e,n){try{return {type:"normal",arg:t.call(e,n)}}catch(t){return {type:"throw",arg:t}}}t.wrap=s;var u={};function l(){}function f(){}function d(){}var h={};h[o]=function(){return this};var p=Object.getPrototypeOf,m=p&&p(p(E([])));m&&m!==e&&n.call(m,o)&&(h=m);var v=d.prototype=l.prototype=Object.create(h);function y(t){["next","throw","return"].forEach((function(e){t[e]=function(t){return this._invoke(e,t)};}));}function g(t,e){var r;this._invoke=function(o,i){function a(){return new e((function(r,a){!function r(o,i,a,s){var u=c(t[o],t,i);if("throw"!==u.type){var l=u.arg,f=l.value;return f&&"object"==typeof f&&n.call(f,"__await")?e.resolve(f.__await).then((function(t){r("next",t,a,s);}),(function(t){r("throw",t,a,s);})):e.resolve(f).then((function(t){l.value=t,a(l);}),(function(t){return r("throw",t,a,s)}))}s(u.arg);}(o,i,r,a);}))}return r=r?r.then(a,a):a()};}function b(t,e){var n=t.iterator[e.method];if(void 0===n){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=void 0,b(t,e),"throw"===e.method))return u;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method");}return u}var r=c(n,t.iterator,e.arg);if("throw"===r.type)return e.method="throw",e.arg=r.arg,e.delegate=null,u;var o=r.arg;return o?o.done?(e[t.resultName]=o.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=void 0),e.delegate=null,u):o:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,u)}function w(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e);}function k(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e;}function _(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(w,this),this.reset(!0);}function E(t){if(t){var e=t[o];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var r=-1,i=function e(){for(;++r<t.length;)if(n.call(t,r))return e.value=t[r],e.done=!1,e;return e.value=void 0,e.done=!0,e};return i.next=i}}return {next:x}}function x(){return {value:void 0,done:!0}}return f.prototype=v.constructor=d,d.constructor=f,d[a]=f.displayName="GeneratorFunction",t.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return !!e&&(e===f||"GeneratorFunction"===(e.displayName||e.name))},t.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,d):(t.__proto__=d,a in t||(t[a]="GeneratorFunction")),t.prototype=Object.create(v),t},t.awrap=function(t){return {__await:t}},y(g.prototype),g.prototype[i]=function(){return this},t.AsyncIterator=g,t.async=function(e,n,r,o,i){void 0===i&&(i=Promise);var a=new g(s(e,n,r,o),i);return t.isGeneratorFunction(n)?a:a.next().then((function(t){return t.done?t.value:a.next()}))},y(v),v[a]="Generator",v[o]=function(){return this},v.toString=function(){return "[object Generator]"},t.keys=function(t){var e=[];for(var n in t)e.push(n);return e.reverse(),function n(){for(;e.length;){var r=e.pop();if(r in t)return n.value=r,n.done=!1,n}return n.done=!0,n}},t.values=E,_.prototype={constructor:_,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(k),!t)for(var e in this)"t"===e.charAt(0)&&n.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=void 0);},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var e=this;function r(n,r){return a.type="throw",a.arg=t,e.next=n,r&&(e.method="next",e.arg=void 0),!!r}for(var o=this.tryEntries.length-1;o>=0;--o){var i=this.tryEntries[o],a=i.completion;if("root"===i.tryLoc)return r("end");if(i.tryLoc<=this.prev){var s=n.call(i,"catchLoc"),c=n.call(i,"finallyLoc");if(s&&c){if(this.prev<i.catchLoc)return r(i.catchLoc,!0);if(this.prev<i.finallyLoc)return r(i.finallyLoc)}else if(s){if(this.prev<i.catchLoc)return r(i.catchLoc,!0)}else {if(!c)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return r(i.finallyLoc)}}}},abrupt:function(t,e){for(var r=this.tryEntries.length-1;r>=0;--r){var o=this.tryEntries[r];if(o.tryLoc<=this.prev&&n.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var i=o;break}}i&&("break"===t||"continue"===t)&&i.tryLoc<=e&&e<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=t,a.arg=e,i?(this.method="next",this.next=i.finallyLoc,u):this.complete(a)},complete:function(t,e){if("throw"===t.type)throw t.arg;return "break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),u},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.finallyLoc===t)return this.complete(n.completion,n.afterLoc),k(n),u}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.tryLoc===t){var r=n.completion;if("throw"===r.type){var o=r.arg;k(n);}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,n){return this.delegate={iterator:E(t),resultName:e,nextLoc:n},"next"===this.method&&(this.arg=void 0),u}},t}(t.exports);try{regeneratorRuntime=r;}catch(t){Function("r","regeneratorRuntime = r")(r);}},function(t,e,n){var r=n(13),o=n(14);"string"==typeof(o=o.__esModule?o.default:o)&&(o=[[t.i,o,""]]);var i={insert:"head",singleton:!1};r(o,i);t.exports=o.locals||{};},function(t,e,n){var r,o=function(){return void 0===r&&(r=Boolean(window&&document&&document.all&&!window.atob)),r},i=function(){var t={};return function(e){if(void 0===t[e]){var n=document.querySelector(e);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(t){n=null;}t[e]=n;}return t[e]}}(),a=[];function s(t){for(var e=-1,n=0;n<a.length;n++)if(a[n].identifier===t){e=n;break}return e}function c(t,e){for(var n={},r=[],o=0;o<t.length;o++){var i=t[o],c=e.base?i[0]+e.base:i[0],u=n[c]||0,l="".concat(c," ").concat(u);n[c]=u+1;var f=s(l),d={css:i[1],media:i[2],sourceMap:i[3]};-1!==f?(a[f].references++,a[f].updater(d)):a.push({identifier:l,updater:v(d,e),references:1}),r.push(l);}return r}function u(t){var e=document.createElement("style"),r=t.attributes||{};if(void 0===r.nonce){var o=n.nc;o&&(r.nonce=o);}if(Object.keys(r).forEach((function(t){e.setAttribute(t,r[t]);})),"function"==typeof t.insert)t.insert(e);else {var a=i(t.insert||"head");if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(e);}return e}var l,f=(l=[],function(t,e){return l[t]=e,l.filter(Boolean).join("\n")});function d(t,e,n,r){var o=n?"":r.media?"@media ".concat(r.media," {").concat(r.css,"}"):r.css;if(t.styleSheet)t.styleSheet.cssText=f(e,o);else {var i=document.createTextNode(o),a=t.childNodes;a[e]&&t.removeChild(a[e]),a.length?t.insertBefore(i,a[e]):t.appendChild(i);}}function h(t,e,n){var r=n.css,o=n.media,i=n.sourceMap;if(o?t.setAttribute("media",o):t.removeAttribute("media"),i&&btoa&&(r+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(i))))," */")),t.styleSheet)t.styleSheet.cssText=r;else {for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(r));}}var p=null,m=0;function v(t,e){var n,r,o;if(e.singleton){var i=m++;n=p||(p=u(e)),r=d.bind(null,n,i,!1),o=d.bind(null,n,i,!0);}else n=u(e),r=h.bind(null,n,e),o=function(){!function(t){if(null===t.parentNode)return !1;t.parentNode.removeChild(t);}(n);};return r(t),function(e){if(e){if(e.css===t.css&&e.media===t.media&&e.sourceMap===t.sourceMap)return;r(t=e);}else o();}}t.exports=function(t,e){(e=e||{}).singleton||"boolean"==typeof e.singleton||(e.singleton=o());var n=c(t=t||[],e);return function(t){if(t=t||[],"[object Array]"===Object.prototype.toString.call(t)){for(var r=0;r<n.length;r++){var o=s(n[r]);a[o].references--;}for(var i=c(t,e),u=0;u<n.length;u++){var l=s(n[u]);0===a[l].references&&(a[l].updater(),a.splice(l,1));}n=i;}}};},function(t,e,n){(e=n(15)(!1)).push([t.i,".link-tool {\n  position: relative;\n}\n\n  .link-tool__input {\n    padding-left: 38px;\n    background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'%3E%3Cpath stroke='%23707684' stroke-linecap='round' stroke-width='2' d='m7.7 12.6-.021.02a2.795 2.795 0 0 0-.044 4.005v0a2.795 2.795 0 0 0 3.936.006l1.455-1.438a3 3 0 0 0 .34-3.866l-.146-.207'/%3E%3Cpath stroke='%23707684' stroke-linecap='round' stroke-width='2' d='m16.22 11.12.136-.14c.933-.954.992-2.46.135-3.483v0a2.597 2.597 0 0 0-3.664-.32L11.39 8.386a3 3 0 0 0-.301 4.3l.031.034'/%3E%3C/svg%3E\");\n    background-repeat: no-repeat;\n    background-position: 10px;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n  }\n\n  .link-tool__input-holder {\n      position: relative;\n    }\n\n  .link-tool__input-holder--error .link-tool__input {\n          background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'%3E%3Cpath stroke='rgb(224, 147, 147)' stroke-linecap='round' stroke-width='2' d='m7.7 12.6-.021.02a2.795 2.795 0 0 0-.044 4.005v0a2.795 2.795 0 0 0 3.936.006l1.455-1.438a3 3 0 0 0 .34-3.866l-.146-.207'/%3E%3Cpath stroke='rgb(224, 147, 147)' stroke-linecap='round' stroke-width='2' d='m16.22 11.12.136-.14c.933-.954.992-2.46.135-3.483v0a2.597 2.597 0 0 0-3.664-.32L11.39 8.386a3 3 0 0 0-.301 4.3l.031.034'/%3E%3C/svg%3E\");\n          background-color: #fff3f6;\n          border-color: #f3e0e0;\n          color: #a95a5a;\n          box-shadow: inset 0 1px 3px 0 rgba(146, 62, 62, .05);\n        }\n\n  .link-tool__input[contentEditable=true][data-placeholder]::before{\n      position: absolute;\n      content: attr(data-placeholder);\n      color: #707684;\n      font-weight: normal;\n      opacity: 0;\n    }\n\n  .link-tool__input[contentEditable=true][data-placeholder]:empty::before {\n        opacity: 1;\n      }\n\n  .link-tool__input[contentEditable=true][data-placeholder]:empty:focus::before {\n         opacity: 0;\n       }\n\n  .link-tool__progress {\n    position: absolute;\n    box-shadow: inset 0 1px 3px 0 rgba(102, 85, 107, 0.04);\n    height: 100%;\n    width: 0;\n    background-color: #f4f5f7;\n    z-index: -1;\n  }\n\n  .link-tool__progress--loading {\n      -webkit-animation: progress 500ms ease-in;\n      -webkit-animation-fill-mode: forwards;\n    }\n\n  .link-tool__progress--loaded {\n      width: 100%;\n    }\n\n  .link-tool__content {\n    display: block;\n    padding: 25px;\n    border-radius: 2px;\n    box-shadow: 0 0 0 2px #fff;\n    color: initial !important;\n    text-decoration: none !important;\n  }\n\n  .link-tool__content::after {\n      content: \"\";\n      clear: both;\n      display: table;\n    }\n\n  .link-tool__content--rendered {\n      background: #fff;\n      border: 1px solid rgba(201, 201, 204, 0.48);\n      box-shadow: 0 1px 3px rgba(0,0,0, .1);\n      border-radius: 6px;\n      will-change: filter;\n      animation: link-in 450ms 1 cubic-bezier(0.215, 0.61, 0.355, 1);\n    }\n\n  .link-tool__content--rendered:hover {\n        box-shadow: 0 0 3px rgba(0,0,0, .16);\n      }\n\n  .link-tool__image {\n    background-position: center center;\n    background-repeat: no-repeat;\n    background-size: cover;\n    margin: 0 0 0 30px;\n    width: 65px;\n    height: 65px;\n    border-radius: 3px;\n    float: right;\n  }\n\n  .link-tool__title {\n    font-size: 17px;\n    font-weight: 600;\n    line-height: 1.5em;\n    margin: 0 0 10px 0;\n  }\n\n  .link-tool__title + .link-tool__anchor {\n      margin-top: 25px;\n    }\n\n  .link-tool__description {\n    margin: 0 0 20px 0;\n    font-size: 15px;\n    line-height: 1.55em;\n    display: -webkit-box;\n    -webkit-line-clamp: 3;\n    -webkit-box-orient: vertical;\n    overflow: hidden;\n  }\n\n  .link-tool__anchor {\n    display: block;\n    font-size: 15px;\n    line-height: 1em;\n    color: #888 !important;\n    border: 0 !important;\n    padding: 0 !important;\n  }\n\n@keyframes link-in {\n  from {\n    filter: blur(5px);\n  }\n\n  to {\n    filter: none;\n  }\n}\n\n.codex-editor--narrow .link-tool__image {\n  display: none;\n}\n\n@-webkit-keyframes progress {\n  0% {\n    width: 0;\n  }\n  100% {\n    width: 85%;\n  }\n}\n",""]),t.exports=e;},function(t,e,n){t.exports=function(t){var e=[];return e.toString=function(){return this.map((function(e){var n=function(t,e){var n=t[1]||"",r=t[3];if(!r)return n;if(e&&"function"==typeof btoa){var o=(a=r,s=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),c="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(s),"/*# ".concat(c," */")),i=r.sources.map((function(t){return "/*# sourceURL=".concat(r.sourceRoot||"").concat(t," */")}));return [n].concat(i).concat([o]).join("\n")}var a,s,c;return [n].join("\n")}(e,t);return e[2]?"@media ".concat(e[2]," {").concat(n,"}"):n})).join("")},e.i=function(t,n,r){"string"==typeof t&&(t=[[null,t,""]]);var o={};if(r)for(var i=0;i<this.length;i++){var a=this[i][0];null!=a&&(o[a]=!0);}for(var s=0;s<t.length;s++){var c=[].concat(t[s]);r&&o[c[0]]||(n&&(c[2]?c[2]="".concat(n," and ").concat(c[2]):c[2]=n),e.push(c));}},e};},function(t,e,n){(function(t){!function(t){var e=function(){try{return !!Symbol.iterator}catch(t){return !1}}(),n=function(t){var n={next:function(){var e=t.shift();return {done:void 0===e,value:e}}};return e&&(n[Symbol.iterator]=function(){return n}),n},r=function(t){return encodeURIComponent(t).replace(/%20/g,"+")},o=function(t){return decodeURIComponent(String(t).replace(/\+/g," "))};(function(){try{var e=t.URLSearchParams;return "a=1"===new e("?a=1").toString()&&"function"==typeof e.prototype.set}catch(t){return !1}})()||function(){var o=function(t){Object.defineProperty(this,"_entries",{writable:!0,value:{}});var e=typeof t;if("undefined"===e);else if("string"===e)""!==t&&this._fromString(t);else if(t instanceof o){var n=this;t.forEach((function(t,e){n.append(e,t);}));}else {if(null===t||"object"!==e)throw new TypeError("Unsupported input's type for URLSearchParams");if("[object Array]"===Object.prototype.toString.call(t))for(var r=0;r<t.length;r++){var i=t[r];if("[object Array]"!==Object.prototype.toString.call(i)&&2===i.length)throw new TypeError("Expected [string, any] as entry at index "+r+" of URLSearchParams's input");this.append(i[0],i[1]);}else for(var a in t)t.hasOwnProperty(a)&&this.append(a,t[a]);}},i=o.prototype;i.append=function(t,e){t in this._entries?this._entries[t].push(String(e)):this._entries[t]=[String(e)];},i.delete=function(t){delete this._entries[t];},i.get=function(t){return t in this._entries?this._entries[t][0]:null},i.getAll=function(t){return t in this._entries?this._entries[t].slice(0):[]},i.has=function(t){return t in this._entries},i.set=function(t,e){this._entries[t]=[String(e)];},i.forEach=function(t,e){var n;for(var r in this._entries)if(this._entries.hasOwnProperty(r)){n=this._entries[r];for(var o=0;o<n.length;o++)t.call(e,n[o],r,this);}},i.keys=function(){var t=[];return this.forEach((function(e,n){t.push(n);})),n(t)},i.values=function(){var t=[];return this.forEach((function(e){t.push(e);})),n(t)},i.entries=function(){var t=[];return this.forEach((function(e,n){t.push([n,e]);})),n(t)},e&&(i[Symbol.iterator]=i.entries),i.toString=function(){var t=[];return this.forEach((function(e,n){t.push(r(n)+"="+r(e));})),t.join("&")},t.URLSearchParams=o;}();var i=t.URLSearchParams.prototype;"function"!=typeof i.sort&&(i.sort=function(){var t=this,e=[];this.forEach((function(n,r){e.push([r,n]),t._entries||t.delete(r);})),e.sort((function(t,e){return t[0]<e[0]?-1:t[0]>e[0]?1:0})),t._entries&&(t._entries={});for(var n=0;n<e.length;n++)this.append(e[n][0],e[n][1]);}),"function"!=typeof i._fromString&&Object.defineProperty(i,"_fromString",{enumerable:!1,configurable:!1,writable:!1,value:function(t){if(this._entries)this._entries={};else {var e=[];this.forEach((function(t,n){e.push(n);}));for(var n=0;n<e.length;n++)this.delete(e[n]);}var r,i=(t=t.replace(/^\?/,"")).split("&");for(n=0;n<i.length;n++)r=i[n].split("="),this.append(o(r[0]),r.length>1?o(r[1]):"");}});}(void 0!==t?t:"undefined"!=typeof window?window:"undefined"!=typeof self?self:this),function(t){if(function(){try{var e=new t.URL("b","http://a");return e.pathname="c d","http://a/c%20d"===e.href&&e.searchParams}catch(t){return !1}}()||function(){var e=t.URL,n=function(e,n){"string"!=typeof e&&(e=String(e));var r,o=document;if(n&&(void 0===t.location||n!==t.location.href)){(r=(o=document.implementation.createHTMLDocument("")).createElement("base")).href=n,o.head.appendChild(r);try{if(0!==r.href.indexOf(n))throw new Error(r.href)}catch(t){throw new Error("URL unable to set base "+n+" due to "+t)}}var i=o.createElement("a");i.href=e,r&&(o.body.appendChild(i),i.href=i.href);var a=o.createElement("input");if(a.type="url",a.value=e,":"===i.protocol||!/:/.test(i.href)||!a.checkValidity()&&!n)throw new TypeError("Invalid URL");Object.defineProperty(this,"_anchorElement",{value:i});var s=new t.URLSearchParams(this.search),c=!0,u=!0,l=this;["append","delete","set"].forEach((function(t){var e=s[t];s[t]=function(){e.apply(s,arguments),c&&(u=!1,l.search=s.toString(),u=!0);};})),Object.defineProperty(this,"searchParams",{value:s,enumerable:!0});var f=void 0;Object.defineProperty(this,"_updateSearchParams",{enumerable:!1,configurable:!1,writable:!1,value:function(){this.search!==f&&(f=this.search,u&&(c=!1,this.searchParams._fromString(this.search),c=!0));}});},r=n.prototype;["hash","host","hostname","port","protocol"].forEach((function(t){!function(t){Object.defineProperty(r,t,{get:function(){return this._anchorElement[t]},set:function(e){this._anchorElement[t]=e;},enumerable:!0});}(t);})),Object.defineProperty(r,"search",{get:function(){return this._anchorElement.search},set:function(t){this._anchorElement.search=t,this._updateSearchParams();},enumerable:!0}),Object.defineProperties(r,{toString:{get:function(){var t=this;return function(){return t.href}}},href:{get:function(){return this._anchorElement.href.replace(/\?$/,"")},set:function(t){this._anchorElement.href=t,this._updateSearchParams();},enumerable:!0},pathname:{get:function(){return this._anchorElement.pathname.replace(/(^\/?)/,"/")},set:function(t){this._anchorElement.pathname=t;},enumerable:!0},origin:{get:function(){var t={"http:":80,"https:":443,"ftp:":21}[this._anchorElement.protocol],e=this._anchorElement.port!=t&&""!==this._anchorElement.port;return this._anchorElement.protocol+"//"+this._anchorElement.hostname+(e?":"+this._anchorElement.port:"")},enumerable:!0},password:{get:function(){return ""},set:function(t){},enumerable:!0},username:{get:function(){return ""},set:function(t){},enumerable:!0}}),n.createObjectURL=function(t){return e.createObjectURL.apply(e,arguments)},n.revokeObjectURL=function(t){return e.revokeObjectURL.apply(e,arguments)},t.URL=n;}(),void 0!==t.location&&!("origin"in t.location)){var e=function(){return t.location.protocol+"//"+t.location.hostname+(t.location.port?":"+t.location.port:"")};try{Object.defineProperty(t.location,"origin",{get:e,enumerable:!0});}catch(n){setInterval((function(){t.location.origin=e();}),100);}}}(void 0!==t?t:"undefined"!=typeof window?window:"undefined"!=typeof self?self:this);}).call(this,n(17));},function(t,e){var n;n=function(){return this}();try{n=n||new Function("return this")();}catch(t){"object"==typeof window&&(n=window);}t.exports=n;},function(t,e,n){n.r(e),n.d(e,"default",(function(){return m}));var r=n(3),o=n.n(r),i=n(0),a=n.n(i),s=n(4),c=n.n(s),u=n(5),l=n.n(u),f=n(1),d=n.n(f),h=(n(12),n(16),n(6)),p=n.n(h);var m=function(){function t(e){var n=e.data,r=e.config,o=e.api,i=e.readOnly;l()(this,t),this.api=o,this.readOnly=i,this.config={endpoint:r.endpoint||"",headers:r.headers||{}},this.nodes={wrapper:null,container:null,progress:null,input:null,inputHolder:null,linkContent:null,linkImage:null,linkTitle:null,linkDescription:null,linkText:null},this._data={link:"",meta:{}},this.data=n;}var e;return d()(t,null,[{key:"isReadOnlySupported",get:function(){return !0}},{key:"toolbox",get:function(){return {icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M7.69998 12.6L7.67896 12.62C6.53993 13.7048 6.52012 15.5155 7.63516 16.625V16.625C8.72293 17.7073 10.4799 17.7102 11.5712 16.6314L13.0263 15.193C14.0703 14.1609 14.2141 12.525 13.3662 11.3266L13.22 11.12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16.22 11.12L16.3564 10.9805C17.2895 10.0265 17.3478 8.5207 16.4914 7.49733V7.49733C15.569 6.39509 13.9269 6.25143 12.8271 7.17675L11.39 8.38588C10.0935 9.47674 9.95704 11.4241 11.0887 12.6852L11.12 12.72"/></svg>',title:"Link"}}},{key:"enableLineBreaks",get:function(){return !0}}]),d()(t,[{key:"render",value:function(){return this.nodes.wrapper=this.make("div",this.CSS.baseClass),this.nodes.container=this.make("div",this.CSS.container),this.nodes.inputHolder=this.makeInputHolder(),this.nodes.linkContent=this.prepareLinkPreview(),Object.keys(this.data.meta).length?(this.nodes.container.appendChild(this.nodes.linkContent),this.showLinkPreview(this.data.meta)):this.nodes.container.appendChild(this.nodes.inputHolder),this.nodes.wrapper.appendChild(this.nodes.container),this.nodes.wrapper}},{key:"save",value:function(){return this.data}},{key:"validate",value:function(){return ""!==this.data.link.trim()}},{key:"makeInputHolder",value:function(){var t=this,e=this.make("div",this.CSS.inputHolder);return this.nodes.progress=this.make("label",this.CSS.progress),this.nodes.input=this.make("div",[this.CSS.input,this.CSS.inputEl],{contentEditable:!this.readOnly}),this.nodes.input.dataset.placeholder=this.api.i18n.t("Link"),this.readOnly||(this.nodes.input.addEventListener("paste",(function(e){t.startFetching(e);})),this.nodes.input.addEventListener("keydown",(function(e){var n=e.ctrlKey||e.metaKey;switch(e.keyCode){case 13:e.preventDefault(),e.stopPropagation(),t.startFetching(e);break;case 65:n&&t.selectLinkUrl(e);}}))),e.appendChild(this.nodes.progress),e.appendChild(this.nodes.input),e}},{key:"startFetching",value:function(t){var e=this.nodes.input.textContent;"paste"===t.type&&(e=(t.clipboardData||window.clipboardData).getData("text")),this.removeErrorStyle(),this.fetchLinkData(e);}},{key:"removeErrorStyle",value:function(){this.nodes.inputHolder.classList.remove(this.CSS.inputError),this.nodes.inputHolder.insertBefore(this.nodes.progress,this.nodes.input);}},{key:"selectLinkUrl",value:function(t){t.preventDefault(),t.stopPropagation();var e=window.getSelection(),n=new Range,r=e.anchorNode.parentNode.closest(".".concat(this.CSS.inputHolder)).querySelector(".".concat(this.CSS.inputEl));n.selectNodeContents(r),e.removeAllRanges(),e.addRange(n);}},{key:"prepareLinkPreview",value:function(){var t=this.make("a",this.CSS.linkContent,{target:"_blank",rel:"nofollow noindex noreferrer"});return this.nodes.linkImage=this.make("div",this.CSS.linkImage),this.nodes.linkTitle=this.make("div",this.CSS.linkTitle),this.nodes.linkDescription=this.make("p",this.CSS.linkDescription),this.nodes.linkText=this.make("span",this.CSS.linkText),t}},{key:"showLinkPreview",value:function(t){var e=t.image,n=t.title,r=t.description;this.nodes.container.appendChild(this.nodes.linkContent),e&&e.url&&(this.nodes.linkImage.style.backgroundImage="url("+e.url+")",this.nodes.linkContent.appendChild(this.nodes.linkImage)),n&&(this.nodes.linkTitle.textContent=n,this.nodes.linkContent.appendChild(this.nodes.linkTitle)),r&&(this.nodes.linkDescription.textContent=r,this.nodes.linkContent.appendChild(this.nodes.linkDescription)),this.nodes.linkContent.classList.add(this.CSS.linkContentRendered),this.nodes.linkContent.setAttribute("href",this.data.link),this.nodes.linkContent.appendChild(this.nodes.linkText);try{this.nodes.linkText.textContent=new URL(this.data.link).hostname;}catch(t){this.nodes.linkText.textContent=this.data.link;}}},{key:"showProgress",value:function(){this.nodes.progress.classList.add(this.CSS.progressLoading);}},{key:"hideProgress",value:function(){var t=this;return new Promise((function(e){t.nodes.progress.classList.remove(t.CSS.progressLoading),t.nodes.progress.classList.add(t.CSS.progressLoaded),setTimeout(e,500);}))}},{key:"applyErrorStyle",value:function(){this.nodes.inputHolder.classList.add(this.CSS.inputError),this.nodes.progress.remove();}},{key:"fetchLinkData",value:(e=c()(a.a.mark((function t(e){var n,r;return a.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return this.showProgress(),this.data={link:e},t.prev=2,t.next=5,p.a.get({url:this.config.endpoint,headers:this.config.headers,data:{url:e}});case 5:n=t.sent,r=n.body,this.onFetch(r),t.next=13;break;case 10:t.prev=10,t.t0=t.catch(2),this.fetchingFailed(this.api.i18n.t("Couldn't fetch the link data"));case 13:case"end":return t.stop()}}),t,this,[[2,10]])}))),function(t){return e.apply(this,arguments)})},{key:"onFetch",value:function(t){var e=this;if(t&&t.success){var n=t.meta,r=t.link||this.data.link;this.data={meta:n,link:r},n?this.hideProgress().then((function(){e.nodes.inputHolder.remove(),e.showLinkPreview(n);})):this.fetchingFailed(this.api.i18n.t("Wrong response format from the server"));}else this.fetchingFailed(this.api.i18n.t("Couldn't get this link data, try the other one"));}},{key:"fetchingFailed",value:function(t){this.api.notifier.show({message:t,style:"error"}),this.applyErrorStyle();}},{key:"make",value:function(t){var e,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},i=document.createElement(t);Array.isArray(n)?(e=i.classList).add.apply(e,o()(n)):n&&i.classList.add(n);for(var a in r)i[a]=r[a];return i}},{key:"data",set:function(t){this._data=Object.assign({},{link:t.link||this._data.link,meta:t.meta||this._data.meta});},get:function(){return this._data}},{key:"CSS",get:function(){return {baseClass:this.api.styles.block,input:this.api.styles.input,container:"link-tool",inputEl:"link-tool__input",inputHolder:"link-tool__input-holder",inputError:"link-tool__input-holder--error",linkContent:"link-tool__content",linkContentRendered:"link-tool__content--rendered",linkImage:"link-tool__image",linkTitle:"link-tool__title",linkDescription:"link-tool__description",linkText:"link-tool__anchor",progress:"link-tool__progress",progressLoading:"link-tool__progress--loading",progressLoaded:"link-tool__progress--loaded"}}}]),t}();}]).default})); 
    } (bundle$5));

    var bundleExports$5 = bundle$5.exports;
    var LinkTool = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$5);

    var bundle$4 = {exports: {}};

    /*!
     * Image tool
     * 
     * @version 2.8.2
     * 
     * @package https://github.com/editor-js/image
     * @licence MIT
     * @author CodeX <https://codex.so>
     */

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,(function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=9)}([function(e,t){function n(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}e.exports=function(e,t,r){return t&&n(e.prototype,t),r&&n(e,r),e};},function(e,t,n){e.exports=function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=3)}([function(e,t){var n;n=function(){return this}();try{n=n||new Function("return this")();}catch(e){"object"==typeof window&&(n=window);}e.exports=n;},function(e,t,n){(function(e){var r=n(2),o=setTimeout;function i(){}function a(e){if(!(this instanceof a))throw new TypeError("Promises must be constructed via new");if("function"!=typeof e)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=void 0,this._deferreds=[],f(e,this);}function u(e,t){for(;3===e._state;)e=e._value;0!==e._state?(e._handled=!0,a._immediateFn((function(){var n=1===e._state?t.onFulfilled:t.onRejected;if(null!==n){var r;try{r=n(e._value);}catch(e){return void s(t.promise,e)}c(t.promise,r);}else (1===e._state?c:s)(t.promise,e._value);}))):e._deferreds.push(t);}function c(e,t){try{if(t===e)throw new TypeError("A promise cannot be resolved with itself.");if(t&&("object"==typeof t||"function"==typeof t)){var n=t.then;if(t instanceof a)return e._state=3,e._value=t,void l(e);if("function"==typeof n)return void f((r=n,o=t,function(){r.apply(o,arguments);}),e)}e._state=1,e._value=t,l(e);}catch(t){s(e,t);}var r,o;}function s(e,t){e._state=2,e._value=t,l(e);}function l(e){2===e._state&&0===e._deferreds.length&&a._immediateFn((function(){e._handled||a._unhandledRejectionFn(e._value);}));for(var t=0,n=e._deferreds.length;t<n;t++)u(e,e._deferreds[t]);e._deferreds=null;}function d(e,t,n){this.onFulfilled="function"==typeof e?e:null,this.onRejected="function"==typeof t?t:null,this.promise=n;}function f(e,t){var n=!1;try{e((function(e){n||(n=!0,c(t,e));}),(function(e){n||(n=!0,s(t,e));}));}catch(e){if(n)return;n=!0,s(t,e);}}a.prototype.catch=function(e){return this.then(null,e)},a.prototype.then=function(e,t){var n=new this.constructor(i);return u(this,new d(e,t,n)),n},a.prototype.finally=r.a,a.all=function(e){return new a((function(t,n){if(!e||void 0===e.length)throw new TypeError("Promise.all accepts an array");var r=Array.prototype.slice.call(e);if(0===r.length)return t([]);var o=r.length;function i(e,a){try{if(a&&("object"==typeof a||"function"==typeof a)){var u=a.then;if("function"==typeof u)return void u.call(a,(function(t){i(e,t);}),n)}r[e]=a,0==--o&&t(r);}catch(e){n(e);}}for(var a=0;a<r.length;a++)i(a,r[a]);}))},a.resolve=function(e){return e&&"object"==typeof e&&e.constructor===a?e:new a((function(t){t(e);}))},a.reject=function(e){return new a((function(t,n){n(e);}))},a.race=function(e){return new a((function(t,n){for(var r=0,o=e.length;r<o;r++)e[r].then(t,n);}))},a._immediateFn="function"==typeof e&&function(t){e(t);}||function(e){o(e,0);},a._unhandledRejectionFn=function(e){"undefined"!=typeof console&&console&&console.warn("Possible Unhandled Promise Rejection:",e);},t.a=a;}).call(this,n(5).setImmediate);},function(e,t,n){t.a=function(e){var t=this.constructor;return this.then((function(n){return t.resolve(e()).then((function(){return n}))}),(function(n){return t.resolve(e()).then((function(){return t.reject(n)}))}))};},function(e,t,n){function r(e){return (r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}n(4);var o,i,a,u,c,s,l,d=n(8),f=(i=function(e){return new Promise((function(t,n){e=u(e),(e=c(e)).beforeSend&&e.beforeSend();var r=window.XMLHttpRequest?new window.XMLHttpRequest:new window.ActiveXObject("Microsoft.XMLHTTP");r.open(e.method,e.url),r.setRequestHeader("X-Requested-With","XMLHttpRequest"),Object.keys(e.headers).forEach((function(t){var n=e.headers[t];r.setRequestHeader(t,n);}));var o=e.ratio;r.upload.addEventListener("progress",(function(t){var n=Math.round(t.loaded/t.total*100),r=Math.ceil(n*o/100);e.progress(Math.min(r,100));}),!1),r.addEventListener("progress",(function(t){var n=Math.round(t.loaded/t.total*100),r=Math.ceil(n*(100-o)/100)+o;e.progress(Math.min(r,100));}),!1),r.onreadystatechange=function(){if(4===r.readyState){var e=r.response;try{e=JSON.parse(e);}catch(e){}var o=d.parseHeaders(r.getAllResponseHeaders()),i={body:e,code:r.status,headers:o};l(r.status)?t(i):n(i);}},r.send(e.data);}))},a=function(e){return e.method="POST",i(e)},u=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(e.url&&"string"!=typeof e.url)throw new Error("Url must be a string");if(e.url=e.url||"",e.method&&"string"!=typeof e.method)throw new Error("`method` must be a string or null");if(e.method=e.method?e.method.toUpperCase():"GET",e.headers&&"object"!==r(e.headers))throw new Error("`headers` must be an object or null");if(e.headers=e.headers||{},e.type&&("string"!=typeof e.type||!Object.values(o).includes(e.type)))throw new Error("`type` must be taken from module's «contentType» library");if(e.progress&&"function"!=typeof e.progress)throw new Error("`progress` must be a function or null");if(e.progress=e.progress||function(e){},e.beforeSend=e.beforeSend||function(e){},e.ratio&&"number"!=typeof e.ratio)throw new Error("`ratio` must be a number");if(e.ratio<0||e.ratio>100)throw new Error("`ratio` must be in a 0-100 interval");if(e.ratio=e.ratio||90,e.accept&&"string"!=typeof e.accept)throw new Error("`accept` must be a string with a list of allowed mime-types");if(e.accept=e.accept||"*/*",e.multiple&&"boolean"!=typeof e.multiple)throw new Error("`multiple` must be a true or false");if(e.multiple=e.multiple||!1,e.fieldName&&"string"!=typeof e.fieldName)throw new Error("`fieldName` must be a string");return e.fieldName=e.fieldName||"files",e},c=function(e){switch(e.method){case"GET":var t=s(e.data,o.URLENCODED);delete e.data,e.url=/\?/.test(e.url)?e.url+"&"+t:e.url+"?"+t;break;case"POST":case"PUT":case"DELETE":case"UPDATE":var n=function(){return (arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}).type||o.JSON}(e);(d.isFormData(e.data)||d.isFormElement(e.data))&&(n=o.FORM),e.data=s(e.data,n),n!==f.contentType.FORM&&(e.headers["content-type"]=n);}return e},s=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};switch(arguments.length>1?arguments[1]:void 0){case o.URLENCODED:return d.urlEncode(e);case o.JSON:return d.jsonEncode(e);case o.FORM:return d.formEncode(e);default:return e}},l=function(e){return e>=200&&e<300},{contentType:o={URLENCODED:"application/x-www-form-urlencoded; charset=utf-8",FORM:"multipart/form-data",JSON:"application/json; charset=utf-8"},request:i,get:function(e){return e.method="GET",i(e)},post:a,transport:function(e){return e=u(e),d.selectFiles(e).then((function(t){for(var n=new FormData,r=0;r<t.length;r++)n.append(e.fieldName,t[r],t[r].name);d.isObject(e.data)&&Object.keys(e.data).forEach((function(t){var r=e.data[t];n.append(t,r);}));var o=e.beforeSend;return e.beforeSend=function(){return o(t)},e.data=n,a(e)}))},selectFiles:function(e){return delete(e=u(e)).beforeSend,d.selectFiles(e)}});e.exports=f;},function(e,t,n){n.r(t);var r=n(1);window.Promise=window.Promise||r.a;},function(e,t,n){(function(e){var r=void 0!==e&&e||"undefined"!=typeof self&&self||window,o=Function.prototype.apply;function i(e,t){this._id=e,this._clearFn=t;}t.setTimeout=function(){return new i(o.call(setTimeout,r,arguments),clearTimeout)},t.setInterval=function(){return new i(o.call(setInterval,r,arguments),clearInterval)},t.clearTimeout=t.clearInterval=function(e){e&&e.close();},i.prototype.unref=i.prototype.ref=function(){},i.prototype.close=function(){this._clearFn.call(r,this._id);},t.enroll=function(e,t){clearTimeout(e._idleTimeoutId),e._idleTimeout=t;},t.unenroll=function(e){clearTimeout(e._idleTimeoutId),e._idleTimeout=-1;},t._unrefActive=t.active=function(e){clearTimeout(e._idleTimeoutId);var t=e._idleTimeout;t>=0&&(e._idleTimeoutId=setTimeout((function(){e._onTimeout&&e._onTimeout();}),t));},n(6),t.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==e&&e.setImmediate||this&&this.setImmediate,t.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==e&&e.clearImmediate||this&&this.clearImmediate;}).call(this,n(0));},function(e,t,n){(function(e,t){!function(e,n){if(!e.setImmediate){var r,o,i,a,u,c=1,s={},l=!1,d=e.document,f=Object.getPrototypeOf&&Object.getPrototypeOf(e);f=f&&f.setTimeout?f:e,"[object process]"==={}.toString.call(e.process)?r=function(e){t.nextTick((function(){h(e);}));}:function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1;},e.postMessage("","*"),e.onmessage=n,t}}()?(a="setImmediate$"+Math.random()+"$",u=function(t){t.source===e&&"string"==typeof t.data&&0===t.data.indexOf(a)&&h(+t.data.slice(a.length));},e.addEventListener?e.addEventListener("message",u,!1):e.attachEvent("onmessage",u),r=function(t){e.postMessage(a+t,"*");}):e.MessageChannel?((i=new MessageChannel).port1.onmessage=function(e){h(e.data);},r=function(e){i.port2.postMessage(e);}):d&&"onreadystatechange"in d.createElement("script")?(o=d.documentElement,r=function(e){var t=d.createElement("script");t.onreadystatechange=function(){h(e),t.onreadystatechange=null,o.removeChild(t),t=null;},o.appendChild(t);}):r=function(e){setTimeout(h,0,e);},f.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var o={callback:e,args:t};return s[c]=o,r(c),c++},f.clearImmediate=p;}function p(e){delete s[e];}function h(e){if(l)setTimeout(h,0,e);else {var t=s[e];if(t){l=!0;try{!function(e){var t=e.callback,n=e.args;switch(n.length){case 0:t();break;case 1:t(n[0]);break;case 2:t(n[0],n[1]);break;case 3:t(n[0],n[1],n[2]);break;default:t.apply(void 0,n);}}(t);}finally{p(e),l=!1;}}}}}("undefined"==typeof self?void 0===e?this:e:self);}).call(this,n(0),n(7));},function(e,t){var n,r,o=e.exports={};function i(){throw new Error("setTimeout has not been defined")}function a(){throw new Error("clearTimeout has not been defined")}function u(e){if(n===setTimeout)return setTimeout(e,0);if((n===i||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:i;}catch(e){n=i;}try{r="function"==typeof clearTimeout?clearTimeout:a;}catch(e){r=a;}}();var c,s=[],l=!1,d=-1;function f(){l&&c&&(l=!1,c.length?s=c.concat(s):d=-1,s.length&&p());}function p(){if(!l){var e=u(f);l=!0;for(var t=s.length;t;){for(c=s,s=[];++d<t;)c&&c[d].run();d=-1,t=s.length;}c=null,l=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===a||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e);}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e);}}function h(e,t){this.fun=e,this.array=t;}function m(){}o.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];s.push(new h(e,t)),1!==s.length||l||u(p);},h.prototype.run=function(){this.fun.apply(null,this.array);},o.title="browser",o.browser=!0,o.env={},o.argv=[],o.version="",o.versions={},o.on=m,o.addListener=m,o.once=m,o.off=m,o.removeListener=m,o.removeAllListeners=m,o.emit=m,o.prependListener=m,o.prependOnceListener=m,o.listeners=function(e){return []},o.binding=function(e){throw new Error("process.binding is not supported")},o.cwd=function(){return "/"},o.chdir=function(e){throw new Error("process.chdir is not supported")},o.umask=function(){return 0};},function(e,t,n){function r(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}var o=n(9);e.exports=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e);}var t,n;return t=e,(n=[{key:"urlEncode",value:function(e){return o(e)}},{key:"jsonEncode",value:function(e){return JSON.stringify(e)}},{key:"formEncode",value:function(e){if(this.isFormData(e))return e;if(this.isFormElement(e))return new FormData(e);if(this.isObject(e)){var t=new FormData;return Object.keys(e).forEach((function(n){var r=e[n];t.append(n,r);})),t}throw new Error("`data` must be an instance of Object, FormData or <FORM> HTMLElement")}},{key:"isObject",value:function(e){return "[object Object]"===Object.prototype.toString.call(e)}},{key:"isFormData",value:function(e){return e instanceof FormData}},{key:"isFormElement",value:function(e){return e instanceof HTMLFormElement}},{key:"selectFiles",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return new Promise((function(t,n){var r=document.createElement("INPUT");r.type="file",e.multiple&&r.setAttribute("multiple","multiple"),e.accept&&r.setAttribute("accept",e.accept),r.style.display="none",document.body.appendChild(r),r.addEventListener("change",(function(e){var n=e.target.files;t(n),document.body.removeChild(r);}),!1),r.click();}))}},{key:"parseHeaders",value:function(e){var t=e.trim().split(/[\r\n]+/),n={};return t.forEach((function(e){var t=e.split(": "),r=t.shift(),o=t.join(": ");r&&(n[r]=o);})),n}}])&&r(t,n),e}();},function(e,t){var n=function(e){return encodeURIComponent(e).replace(/[!'()*]/g,escape).replace(/%20/g,"+")},r=function(e,t,o,i){return t=t||null,o=o||"&",i=i||null,e?function(e){for(var t=new Array,n=0;n<e.length;n++)e[n]&&t.push(e[n]);return t}(Object.keys(e).map((function(a){var u,c,s=a;if(i&&(s=i+"["+s+"]"),"object"==typeof e[a]&&null!==e[a])u=r(e[a],null,o,s);else {t&&(c=s,s=!isNaN(parseFloat(c))&&isFinite(c)?t+Number(s):s);var l=e[a];l=(l=0===(l=!1===(l=!0===l?"1":l)?"0":l)?"0":l)||"",u=n(s)+"="+n(l);}return u}))).join(o).replace(/[!'()*]/g,""):""};e.exports=r;}]);},function(e,t){e.exports=function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")};},function(e,t,n){e.exports=n(10);},function(e,t){e.exports=function(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r};},function(e,t,n){var r=n(4);e.exports=function(e,t){if(e){if("string"==typeof e)return r(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return "Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(n):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?r(e,t):void 0}};},function(e,t){function n(e,t,n,r,o,i,a){try{var u=e[i](a),c=u.value;}catch(e){return void n(e)}u.done?t(c):Promise.resolve(c).then(r,o);}e.exports=function(e){return function(){var t=this,r=arguments;return new Promise((function(o,i){var a=e.apply(t,r);function u(e){n(a,o,i,u,c,"next",e);}function c(e){n(a,o,i,u,c,"throw",e);}u(void 0);}))}};},function(e,t,n){var r=n(15),o=n(16),i=n(5),a=n(17);e.exports=function(e){return r(e)||o(e)||i(e)||a()};},function(e,t,n){var r=n(18),o=n(19),i=n(5),a=n(20);e.exports=function(e,t){return r(e)||o(e,t)||i(e,t)||a()};},function(e,t,n){e.exports=n(21);},function(e,t,n){var r=function(e){var t=Object.prototype,n=t.hasOwnProperty,r="function"==typeof Symbol?Symbol:{},o=r.iterator||"@@iterator",i=r.asyncIterator||"@@asyncIterator",a=r.toStringTag||"@@toStringTag";function u(e,t,n,r){var o=t&&t.prototype instanceof l?t:l,i=Object.create(o.prototype),a=new _(r||[]);return i._invoke=function(e,t,n){var r="suspendedStart";return function(o,i){if("executing"===r)throw new Error("Generator is already running");if("completed"===r){if("throw"===o)throw i;return E()}for(n.method=o,n.arg=i;;){var a=n.delegate;if(a){var u=b(a,n);if(u){if(u===s)continue;return u}}if("next"===n.method)n.sent=n._sent=n.arg;else if("throw"===n.method){if("suspendedStart"===r)throw r="completed",n.arg;n.dispatchException(n.arg);}else "return"===n.method&&n.abrupt("return",n.arg);r="executing";var l=c(e,t,n);if("normal"===l.type){if(r=n.done?"completed":"suspendedYield",l.arg===s)continue;return {value:l.arg,done:n.done}}"throw"===l.type&&(r="completed",n.method="throw",n.arg=l.arg);}}}(e,n,a),i}function c(e,t,n){try{return {type:"normal",arg:e.call(t,n)}}catch(e){return {type:"throw",arg:e}}}e.wrap=u;var s={};function l(){}function d(){}function f(){}var p={};p[o]=function(){return this};var h=Object.getPrototypeOf,m=h&&h(h(x([])));m&&m!==t&&n.call(m,o)&&(p=m);var g=f.prototype=l.prototype=Object.create(p);function y(e){["next","throw","return"].forEach((function(t){e[t]=function(e){return this._invoke(t,e)};}));}function v(e,t){var r;this._invoke=function(o,i){function a(){return new t((function(r,a){!function r(o,i,a,u){var s=c(e[o],e,i);if("throw"!==s.type){var l=s.arg,d=l.value;return d&&"object"==typeof d&&n.call(d,"__await")?t.resolve(d.__await).then((function(e){r("next",e,a,u);}),(function(e){r("throw",e,a,u);})):t.resolve(d).then((function(e){l.value=e,a(l);}),(function(e){return r("throw",e,a,u)}))}u(s.arg);}(o,i,r,a);}))}return r=r?r.then(a,a):a()};}function b(e,t){var n=e.iterator[t.method];if(void 0===n){if(t.delegate=null,"throw"===t.method){if(e.iterator.return&&(t.method="return",t.arg=void 0,b(e,t),"throw"===t.method))return s;t.method="throw",t.arg=new TypeError("The iterator does not provide a 'throw' method");}return s}var r=c(n,e.iterator,t.arg);if("throw"===r.type)return t.method="throw",t.arg=r.arg,t.delegate=null,s;var o=r.arg;return o?o.done?(t[e.resultName]=o.value,t.next=e.nextLoc,"return"!==t.method&&(t.method="next",t.arg=void 0),t.delegate=null,s):o:(t.method="throw",t.arg=new TypeError("iterator result is not an object"),t.delegate=null,s)}function w(e){var t={tryLoc:e[0]};1 in e&&(t.catchLoc=e[1]),2 in e&&(t.finallyLoc=e[2],t.afterLoc=e[3]),this.tryEntries.push(t);}function k(e){var t=e.completion||{};t.type="normal",delete t.arg,e.completion=t;}function _(e){this.tryEntries=[{tryLoc:"root"}],e.forEach(w,this),this.reset(!0);}function x(e){if(e){var t=e[o];if(t)return t.call(e);if("function"==typeof e.next)return e;if(!isNaN(e.length)){var r=-1,i=function t(){for(;++r<e.length;)if(n.call(e,r))return t.value=e[r],t.done=!1,t;return t.value=void 0,t.done=!0,t};return i.next=i}}return {next:E}}function E(){return {value:void 0,done:!0}}return d.prototype=g.constructor=f,f.constructor=d,f[a]=d.displayName="GeneratorFunction",e.isGeneratorFunction=function(e){var t="function"==typeof e&&e.constructor;return !!t&&(t===d||"GeneratorFunction"===(t.displayName||t.name))},e.mark=function(e){return Object.setPrototypeOf?Object.setPrototypeOf(e,f):(e.__proto__=f,a in e||(e[a]="GeneratorFunction")),e.prototype=Object.create(g),e},e.awrap=function(e){return {__await:e}},y(v.prototype),v.prototype[i]=function(){return this},e.AsyncIterator=v,e.async=function(t,n,r,o,i){void 0===i&&(i=Promise);var a=new v(u(t,n,r,o),i);return e.isGeneratorFunction(n)?a:a.next().then((function(e){return e.done?e.value:a.next()}))},y(g),g[a]="Generator",g[o]=function(){return this},g.toString=function(){return "[object Generator]"},e.keys=function(e){var t=[];for(var n in e)t.push(n);return t.reverse(),function n(){for(;t.length;){var r=t.pop();if(r in e)return n.value=r,n.done=!1,n}return n.done=!0,n}},e.values=x,_.prototype={constructor:_,reset:function(e){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(k),!e)for(var t in this)"t"===t.charAt(0)&&n.call(this,t)&&!isNaN(+t.slice(1))&&(this[t]=void 0);},stop:function(){this.done=!0;var e=this.tryEntries[0].completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(e){if(this.done)throw e;var t=this;function r(n,r){return a.type="throw",a.arg=e,t.next=n,r&&(t.method="next",t.arg=void 0),!!r}for(var o=this.tryEntries.length-1;o>=0;--o){var i=this.tryEntries[o],a=i.completion;if("root"===i.tryLoc)return r("end");if(i.tryLoc<=this.prev){var u=n.call(i,"catchLoc"),c=n.call(i,"finallyLoc");if(u&&c){if(this.prev<i.catchLoc)return r(i.catchLoc,!0);if(this.prev<i.finallyLoc)return r(i.finallyLoc)}else if(u){if(this.prev<i.catchLoc)return r(i.catchLoc,!0)}else {if(!c)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return r(i.finallyLoc)}}}},abrupt:function(e,t){for(var r=this.tryEntries.length-1;r>=0;--r){var o=this.tryEntries[r];if(o.tryLoc<=this.prev&&n.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var i=o;break}}i&&("break"===e||"continue"===e)&&i.tryLoc<=t&&t<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=e,a.arg=t,i?(this.method="next",this.next=i.finallyLoc,s):this.complete(a)},complete:function(e,t){if("throw"===e.type)throw e.arg;return "break"===e.type||"continue"===e.type?this.next=e.arg:"return"===e.type?(this.rval=this.arg=e.arg,this.method="return",this.next="end"):"normal"===e.type&&t&&(this.next=t),s},finish:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var n=this.tryEntries[t];if(n.finallyLoc===e)return this.complete(n.completion,n.afterLoc),k(n),s}},catch:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var n=this.tryEntries[t];if(n.tryLoc===e){var r=n.completion;if("throw"===r.type){var o=r.arg;k(n);}return o}}throw new Error("illegal catch attempt")},delegateYield:function(e,t,n){return this.delegate={iterator:x(e),resultName:t,nextLoc:n},"next"===this.method&&(this.arg=void 0),s}},e}(e.exports);try{regeneratorRuntime=r;}catch(e){Function("r","regeneratorRuntime = r")(r);}},function(e,t,n){var r=n(12),o=n(13);"string"==typeof(o=o.__esModule?o.default:o)&&(o=[[e.i,o,""]]);var i={insert:"head",singleton:!1},a=(r(o,i),o.locals?o.locals:{});e.exports=a;},function(e,t,n){var r,o=function(){return void 0===r&&(r=Boolean(window&&document&&document.all&&!window.atob)),r},i=function(){var e={};return function(t){if(void 0===e[t]){var n=document.querySelector(t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(e){n=null;}e[t]=n;}return e[t]}}(),a=[];function u(e){for(var t=-1,n=0;n<a.length;n++)if(a[n].identifier===e){t=n;break}return t}function c(e,t){for(var n={},r=[],o=0;o<e.length;o++){var i=e[o],c=t.base?i[0]+t.base:i[0],s=n[c]||0,l="".concat(c," ").concat(s);n[c]=s+1;var d=u(l),f={css:i[1],media:i[2],sourceMap:i[3]};-1!==d?(a[d].references++,a[d].updater(f)):a.push({identifier:l,updater:g(f,t),references:1}),r.push(l);}return r}function s(e){var t=document.createElement("style"),r=e.attributes||{};if(void 0===r.nonce){var o=n.nc;o&&(r.nonce=o);}if(Object.keys(r).forEach((function(e){t.setAttribute(e,r[e]);})),"function"==typeof e.insert)e.insert(t);else {var a=i(e.insert||"head");if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(t);}return t}var l,d=(l=[],function(e,t){return l[e]=t,l.filter(Boolean).join("\n")});function f(e,t,n,r){var o=n?"":r.media?"@media ".concat(r.media," {").concat(r.css,"}"):r.css;if(e.styleSheet)e.styleSheet.cssText=d(t,o);else {var i=document.createTextNode(o),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(i,a[t]):e.appendChild(i);}}function p(e,t,n){var r=n.css,o=n.media,i=n.sourceMap;if(o?e.setAttribute("media",o):e.removeAttribute("media"),i&&btoa&&(r+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(i))))," */")),e.styleSheet)e.styleSheet.cssText=r;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(r));}}var h=null,m=0;function g(e,t){var n,r,o;if(t.singleton){var i=m++;n=h||(h=s(t)),r=f.bind(null,n,i,!1),o=f.bind(null,n,i,!0);}else n=s(t),r=p.bind(null,n,t),o=function(){!function(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);}(n);};return r(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;r(e=t);}else o();}}e.exports=function(e,t){(t=t||{}).singleton||"boolean"==typeof t.singleton||(t.singleton=o());var n=c(e=e||[],t);return function(e){if(e=e||[],"[object Array]"===Object.prototype.toString.call(e)){for(var r=0;r<n.length;r++){var o=u(n[r]);a[o].references--;}for(var i=c(e,t),s=0;s<n.length;s++){var l=u(n[s]);0===a[l].references&&(a[l].updater(),a.splice(l,1));}n=i;}}};},function(e,t,n){(t=n(14)(!1)).push([e.i,'.image-tool {\n  --bg-color: #cdd1e0;\n  --front-color: #388ae5;\n  --border-color: #e8e8eb;\n\n}\n\n  .image-tool__image {\n    border-radius: 3px;\n    overflow: hidden;\n    margin-bottom: 10px;\n  }\n\n  .image-tool__image-picture {\n      max-width: 100%;\n      vertical-align: bottom;\n      display: block;\n    }\n\n  .image-tool__image-preloader {\n      width: 50px;\n      height: 50px;\n      border-radius: 50%;\n      background-size: cover;\n      margin: auto;\n      position: relative;\n      background-color: var(--bg-color);\n      background-position: center center;\n    }\n\n  .image-tool__image-preloader::after {\n        content: "";\n        position: absolute;\n        z-index: 3;\n        width: 60px;\n        height: 60px;\n        border-radius: 50%;\n        border: 2px solid var(--bg-color);\n        border-top-color: var(--front-color);\n        left: 50%;\n        top: 50%;\n        margin-top: -30px;\n        margin-left: -30px;\n        animation: image-preloader-spin 2s infinite linear;\n        box-sizing: border-box;\n      }\n\n  .image-tool__caption[contentEditable="true"][data-placeholder]::before {\n      position: absolute !important;\n      content: attr(data-placeholder);\n      color: #707684;\n      font-weight: normal;\n      display: none;\n    }\n\n  .image-tool__caption[contentEditable="true"][data-placeholder]:empty::before {\n        display: block;\n      }\n\n  .image-tool__caption[contentEditable="true"][data-placeholder]:empty:focus::before {\n        display: none;\n      }\n\n  .image-tool--empty .image-tool__image {\n      display: none;\n    }\n\n  .image-tool--empty .image-tool__caption, .image-tool--loading .image-tool__caption {\n      display: none;\n    }\n\n  .image-tool .cdx-button {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n  }\n\n  .image-tool .cdx-button svg {\n      height: auto;\n      margin: 0 6px 0 0;\n    }\n\n  .image-tool--filled .cdx-button {\n      display: none;\n    }\n\n  .image-tool--filled .image-tool__image-preloader {\n        display: none;\n      }\n\n  .image-tool--loading .image-tool__image {\n      min-height: 200px;\n      display: flex;\n      border: 1px solid var(--border-color);\n      background-color: #fff;\n    }\n\n  .image-tool--loading .image-tool__image-picture {\n        display: none;\n      }\n\n  .image-tool--loading .cdx-button {\n      display: none;\n    }\n\n  /**\n   * Tunes\n   * ----------------\n   */\n\n  .image-tool--withBorder .image-tool__image {\n      border: 1px solid var(--border-color);\n    }\n\n  .image-tool--withBackground .image-tool__image {\n      padding: 15px;\n      background: var(--bg-color);\n    }\n\n  .image-tool--withBackground .image-tool__image-picture {\n        max-width: 60%;\n        margin: 0 auto;\n      }\n\n  .image-tool--stretched .image-tool__image-picture {\n        width: 100%;\n      }\n\n@keyframes image-preloader-spin {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n',""]),e.exports=t;},function(e,t,n){e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=function(e,t){var n=e[1]||"",r=e[3];if(!r)return n;if(t&&"function"==typeof btoa){var o=(a=r,u=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),c="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(u),"/*# ".concat(c," */")),i=r.sources.map((function(e){return "/*# sourceURL=".concat(r.sourceRoot||"").concat(e," */")}));return [n].concat(i).concat([o]).join("\n")}var a,u,c;return [n].join("\n")}(t,e);return t[2]?"@media ".concat(t[2]," {").concat(n,"}"):n})).join("")},t.i=function(e,n,r){"string"==typeof e&&(e=[[null,e,""]]);var o={};if(r)for(var i=0;i<this.length;i++){var a=this[i][0];null!=a&&(o[a]=!0);}for(var u=0;u<e.length;u++){var c=[].concat(e[u]);r&&o[c[0]]||(n&&(c[2]?c[2]="".concat(n," and ").concat(c[2]):c[2]=n),t.push(c));}},t};},function(e,t,n){var r=n(4);e.exports=function(e){if(Array.isArray(e))return r(e)};},function(e,t){e.exports=function(e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e))return Array.from(e)};},function(e,t){e.exports=function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")};},function(e,t){e.exports=function(e){if(Array.isArray(e))return e};},function(e,t){e.exports=function(e,t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e)){var n=[],r=!0,o=!1,i=void 0;try{for(var a,u=e[Symbol.iterator]();!(r=(a=u.next()).done)&&(n.push(a.value),!t||n.length!==t);r=!0);}catch(e){o=!0,i=e;}finally{try{r||null==u.return||u.return();}finally{if(o)throw i}}return n}};},function(e,t){e.exports=function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")};},function(e,t,n){n.r(t),n.d(t,"default",(function(){return _}));var r=n(3),o=n.n(r),i=n(6),a=n.n(i),u=n(2),c=n.n(u),s=n(0),l=n.n(s);n(11);const d='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><rect width="14" height="14" x="5" y="5" stroke="currentColor" stroke-width="2" rx="4"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.13968 15.32L8.69058 11.5661C9.02934 11.2036 9.48873 11 9.96774 11C10.4467 11 10.9061 11.2036 11.2449 11.5661L15.3871 16M13.5806 14.0664L15.0132 12.533C15.3519 12.1705 15.8113 11.9668 16.2903 11.9668C16.7693 11.9668 17.2287 12.1705 17.5675 12.533L18.841 13.9634"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.7778 9.33331H13.7867"/></svg>';var f=n(7),p=n.n(f);function h(e){var t,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},o=document.createElement(e);Array.isArray(n)?(t=o.classList).add.apply(t,p()(n)):n&&o.classList.add(n);for(var i in r)o[i]=r[i];return o}var m=function(){function e(t){var n=t.api,r=t.config,o=t.onSelectFile,i=t.readOnly;c()(this,e),this.api=n,this.config=r,this.onSelectFile=o,this.readOnly=i,this.nodes={wrapper:h("div",[this.CSS.baseClass,this.CSS.wrapper]),imageContainer:h("div",[this.CSS.imageContainer]),fileButton:this.createFileButton(),imageEl:void 0,imagePreloader:h("div",this.CSS.imagePreloader),caption:h("div",[this.CSS.input,this.CSS.caption],{contentEditable:!this.readOnly})},this.nodes.caption.dataset.placeholder=this.config.captionPlaceholder,this.nodes.imageContainer.appendChild(this.nodes.imagePreloader),this.nodes.wrapper.appendChild(this.nodes.imageContainer),this.nodes.wrapper.appendChild(this.nodes.caption),this.nodes.wrapper.appendChild(this.nodes.fileButton);}return l()(e,[{key:"render",value:function(t){return t.file&&0!==Object.keys(t.file).length?this.toggleStatus(e.status.UPLOADING):this.toggleStatus(e.status.EMPTY),this.nodes.wrapper}},{key:"createFileButton",value:function(){var e=this,t=h("div",[this.CSS.button]);return t.innerHTML=this.config.buttonContent||"".concat(d," ").concat(this.api.i18n.t("Select an Image")),t.addEventListener("click",(function(){e.onSelectFile();})),t}},{key:"showPreloader",value:function(t){this.nodes.imagePreloader.style.backgroundImage="url(".concat(t,")"),this.toggleStatus(e.status.UPLOADING);}},{key:"hidePreloader",value:function(){this.nodes.imagePreloader.style.backgroundImage="",this.toggleStatus(e.status.EMPTY);}},{key:"fillImage",value:function(t){var n=this,r=/\.mp4$/.test(t)?"VIDEO":"IMG",o={src:t},i="load";"VIDEO"===r&&(o.autoplay=!0,o.loop=!0,o.muted=!0,o.playsinline=!0,i="loadeddata"),this.nodes.imageEl=h(r,this.CSS.imageEl,o),this.nodes.imageEl.addEventListener(i,(function(){n.toggleStatus(e.status.FILLED),n.nodes.imagePreloader&&(n.nodes.imagePreloader.style.backgroundImage="");})),this.nodes.imageContainer.appendChild(this.nodes.imageEl);}},{key:"fillCaption",value:function(e){this.nodes.caption&&(this.nodes.caption.innerHTML=e);}},{key:"toggleStatus",value:function(t){for(var n in e.status)Object.prototype.hasOwnProperty.call(e.status,n)&&this.nodes.wrapper.classList.toggle("".concat(this.CSS.wrapper,"--").concat(e.status[n]),t===e.status[n]);}},{key:"applyTune",value:function(e,t){this.nodes.wrapper.classList.toggle("".concat(this.CSS.wrapper,"--").concat(e),t);}},{key:"CSS",get:function(){return {baseClass:this.api.styles.block,loading:this.api.styles.loader,input:this.api.styles.input,button:this.api.styles.button,wrapper:"image-tool",imageContainer:"image-tool__image",imagePreloader:"image-tool__image-preloader",imageEl:"image-tool__image-picture",caption:"image-tool__caption"}}}],[{key:"status",get:function(){return {EMPTY:"empty",UPLOADING:"loading",FILLED:"filled"}}}]),e}(),g=n(8),y=n.n(g),v=n(1),b=n.n(v);function w(e){return e&&"function"==typeof e.then}var k=function(){function e(t){var n=t.config,r=t.onUpload,o=t.onError;c()(this,e),this.config=n,this.onUpload=r,this.onError=o;}return l()(e,[{key:"uploadSelectedFile",value:function(e){var t=this,n=e.onPreview,r=function(e){var t=new FileReader;t.readAsDataURL(e),t.onload=function(e){n(e.target.result);};};(this.config.uploader&&"function"==typeof this.config.uploader.uploadByFile?b.a.selectFiles({accept:this.config.types}).then((function(e){r(e[0]);var n=t.config.uploader.uploadByFile(e[0]);return w(n)||console.warn("Custom uploader method uploadByFile should return a Promise"),n})):b.a.transport({url:this.config.endpoints.byFile,data:this.config.additionalRequestData,accept:this.config.types,headers:this.config.additionalRequestHeaders,beforeSend:function(e){r(e[0]);},fieldName:this.config.field}).then((function(e){return e.body}))).then((function(e){t.onUpload(e);})).catch((function(e){t.onError(e);}));}},{key:"uploadByUrl",value:function(e){var t,n=this;this.config.uploader&&"function"==typeof this.config.uploader.uploadByUrl?w(t=this.config.uploader.uploadByUrl(e))||console.warn("Custom uploader method uploadByUrl should return a Promise"):t=b.a.post({url:this.config.endpoints.byUrl,data:Object.assign({url:e},this.config.additionalRequestData),type:b.a.contentType.JSON,headers:this.config.additionalRequestHeaders}).then((function(e){return e.body})),t.then((function(e){n.onUpload(e);})).catch((function(e){n.onError(e);}));}},{key:"uploadByFile",value:function(e,t){var n,r=this,o=t.onPreview,i=new FileReader;if(i.readAsDataURL(e),i.onload=function(e){o(e.target.result);},this.config.uploader&&"function"==typeof this.config.uploader.uploadByFile)w(n=this.config.uploader.uploadByFile(e))||console.warn("Custom uploader method uploadByFile should return a Promise");else {var a=new FormData;a.append(this.config.field,e),this.config.additionalRequestData&&Object.keys(this.config.additionalRequestData).length&&Object.entries(this.config.additionalRequestData).forEach((function(e){var t=y()(e,2),n=t[0],r=t[1];a.append(n,r);})),n=b.a.post({url:this.config.endpoints.byFile,data:a,type:b.a.contentType.JSON,headers:this.config.additionalRequestHeaders}).then((function(e){return e.body}));}n.then((function(e){r.onUpload(e);})).catch((function(e){r.onError(e);}));}}]),e}(),_=function(){function e(t){var n=this,r=t.data,o=t.config,i=t.api,a=t.readOnly,u=t.block;c()(this,e),this.api=i,this.readOnly=a,this.block=u,this.config={endpoints:o.endpoints||"",additionalRequestData:o.additionalRequestData||{},additionalRequestHeaders:o.additionalRequestHeaders||{},field:o.field||"image",types:o.types||"image/*",captionPlaceholder:this.api.i18n.t(o.captionPlaceholder||"Caption"),buttonContent:o.buttonContent||"",uploader:o.uploader||void 0,actions:o.actions||[]},this.uploader=new k({config:this.config,onUpload:function(e){return n.onUpload(e)},onError:function(e){return n.uploadingFailed(e)}}),this.ui=new m({api:i,config:this.config,onSelectFile:function(){n.uploader.uploadSelectedFile({onPreview:function(e){n.ui.showPreloader(e);}});},readOnly:a}),this._data={},this.data=r;}var t;return l()(e,null,[{key:"isReadOnlySupported",get:function(){return !0}},{key:"toolbox",get:function(){return {icon:d,title:"Image"}}},{key:"tunes",get:function(){return [{name:"withBorder",icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.9919 9.5H19.0015"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.5 5H14.5096"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M14.625 5H15C17.2091 5 19 6.79086 19 9V9.375"/><path stroke="currentColor" stroke-width="2" d="M9.375 5L9 5C6.79086 5 5 6.79086 5 9V9.375"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.3725 5H9.38207"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 9.5H5.00957"/><path stroke="currentColor" stroke-width="2" d="M9.375 19H9C6.79086 19 5 17.2091 5 15V14.625"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.3725 19H9.38207"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 14.55H5.00957"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 13V16M16 19V16M19 16H16M16 16H13"/></svg>',title:"With border",toggle:!0},{name:"stretched",icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9L20 12L17 15"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 12H20"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 9L4 12L7 15"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12H10"/></svg>',title:"Stretch image",toggle:!0},{name:"withBackground",icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19V19C9.13623 19 8.20435 19 7.46927 18.6955C6.48915 18.2895 5.71046 17.5108 5.30448 16.5307C5 15.7956 5 14.8638 5 13V12C5 9.19108 5 7.78661 5.67412 6.77772C5.96596 6.34096 6.34096 5.96596 6.77772 5.67412C7.78661 5 9.19108 5 12 5H13.5C14.8956 5 15.5933 5 16.1611 5.17224C17.4395 5.56004 18.44 6.56046 18.8278 7.83886C19 8.40666 19 9.10444 19 10.5V10.5"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 13V16M16 19V16M19 16H16M16 16H13"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.5 17.5L17.5 6.5"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.9919 10.5H19.0015"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.9919 19H11.0015"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13L13 5"/></svg>',title:"With background",toggle:!0}]}}]),l()(e,[{key:"render",value:function(){return this.ui.render(this.data)}},{key:"validate",value:function(e){return e.file&&e.file.url}},{key:"save",value:function(){var e=this.ui.nodes.caption;return this._data.caption=e.innerHTML,this.data}},{key:"renderSettings",value:function(){var t=this;return e.tunes.concat(this.config.actions).map((function(e){return {icon:e.icon,label:t.api.i18n.t(e.title),name:e.name,toggle:e.toggle,isActive:t.data[e.name],onActivate:function(){"function"!=typeof e.action?t.tuneToggled(e.name):e.action(e.name);}}}))}},{key:"appendCallback",value:function(){this.ui.nodes.fileButton.click();}},{key:"onPaste",value:(t=a()(o.a.mark((function e(t){var n,r,i,a,u;return o.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:e.t0=t.type,e.next="tag"===e.t0?3:"pattern"===e.t0?15:"file"===e.t0?18:21;break;case 3:if(n=t.detail.data,!/^blob:/.test(n.src)){e.next=13;break}return e.next=7,fetch(n.src);case 7:return r=e.sent,e.next=10,r.blob();case 10:return i=e.sent,this.uploadFile(i),e.abrupt("break",21);case 13:return this.uploadUrl(n.src),e.abrupt("break",21);case 15:return a=t.detail.data,this.uploadUrl(a),e.abrupt("break",21);case 18:return u=t.detail.file,this.uploadFile(u),e.abrupt("break",21);case 21:case"end":return e.stop()}}),e,this)}))),function(e){return t.apply(this,arguments)})},{key:"onUpload",value:function(e){e.success&&e.file?this.image=e.file:this.uploadingFailed("incorrect response: "+JSON.stringify(e));}},{key:"uploadingFailed",value:function(e){console.log("Image Tool: uploading failed because of",e),this.api.notifier.show({message:this.api.i18n.t("Couldn’t upload image. Please try another."),style:"error"}),this.ui.hidePreloader();}},{key:"tuneToggled",value:function(e){this.setTune(e,!this._data[e]);}},{key:"setTune",value:function(e,t){var n=this;this._data[e]=t,this.ui.applyTune(e,t),"stretched"===e&&Promise.resolve().then((function(){n.block.stretched=t;})).catch((function(e){console.error(e);}));}},{key:"uploadFile",value:function(e){var t=this;this.uploader.uploadByFile(e,{onPreview:function(e){t.ui.showPreloader(e);}});}},{key:"uploadUrl",value:function(e){this.ui.showPreloader(e),this.uploader.uploadByUrl(e);}},{key:"data",set:function(t){var n=this;this.image=t.file,this._data.caption=t.caption||"",this.ui.fillCaption(this._data.caption),e.tunes.forEach((function(e){var r=e.name,o=void 0!==t[r]&&(!0===t[r]||"true"===t[r]);n.setTune(r,o);}));},get:function(){return this._data}},{key:"image",set:function(e){this._data.file=e||{},e&&e.url&&this.ui.fillImage(e.url);}}],[{key:"pasteConfig",get:function(){return {tags:[{img:{src:!0}}],patterns:{image:/https?:\/\/\S+\.(gif|jpe?g|tiff|png|svg|webp)(\?[a-z0-9=]*)?$/i},files:{mimeTypes:["image/*"]}}}}]),e}();
    	/**
    	 * Image Tool for the Editor.js
    	 *
    	 * @author CodeX <team@codex.so>
    	 * @license MIT
    	 * @see {@link https://github.com/editor-js/image}
    	 *
    	 * To developers.
    	 * To simplify Tool structure, we split it to 4 parts:
    	 *  1) index.js — main Tool's interface, public API and methods for working with data
    	 *  2) uploader.js — module that has methods for sending files via AJAX: from device, by URL or File pasting
    	 *  3) ui.js — module for UI manipulations: render, showing preloader, etc
    	 *  4) tunes.js — working with Block Tunes: render buttons, handle clicks
    	 *
    	 * For debug purposes there is a testing server
    	 * that can save uploaded files and return a Response {@link UploadResponseFormat}
    	 *
    	 *       $ node dev/server.js
    	 *
    	 * It will expose 8008 port, so you can pass http://localhost:8008 with the Tools config:
    	 *
    	 * image: {
    	 *   class: ImageTool,
    	 *   config: {
    	 *     endpoints: {
    	 *       byFile: 'http://localhost:8008/uploadFile',
    	 *       byUrl: 'http://localhost:8008/fetchUrl',
    	 *     }
    	 *   },
    	 * },
    	 */}]).default})); 
    } (bundle$4));

    var bundleExports$4 = bundle$4.exports;
    var ImageTool = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$4);

    var bundle$3 = {exports: {}};

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,(function(){return function(e){var t={};function r(n){if(t[n])return t[n].exports;var i=t[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}return r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n});},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)r.d(n,i,function(t){return e[t]}.bind(null,i));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="/",r(r.s=14)}([function(e,t,r){var n=r(5),i=r(6),o=r(7),a=r(9);e.exports=function(e,t){return n(e)||i(e,t)||o(e,t)||a()};},function(e,t){function r(t){return "function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?e.exports=r=function(e){return typeof e}:e.exports=r=function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r(t)}e.exports=r;},function(e,t){e.exports=function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")};},function(e,t){function r(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n);}}e.exports=function(e,t,n){return t&&r(e.prototype,t),n&&r(e,n),e};},function(e,t){function r(e,t,r){var n,i,o,a,l;function c(){var s=Date.now()-a;s<t&&s>=0?n=setTimeout(c,t-s):(n=null,r||(l=e.apply(o,i),o=i=null));}null==t&&(t=100);var s=function(){o=this,i=arguments,a=Date.now();var s=r&&!n;return n||(n=setTimeout(c,t)),s&&(l=e.apply(o,i),o=i=null),l};return s.clear=function(){n&&(clearTimeout(n),n=null);},s.flush=function(){n&&(l=e.apply(o,i),o=i=null,clearTimeout(n),n=null);},s}r.debounce=r,e.exports=r;},function(e,t){e.exports=function(e){if(Array.isArray(e))return e};},function(e,t){e.exports=function(e,t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e)){var r=[],n=!0,i=!1,o=void 0;try{for(var a,l=e[Symbol.iterator]();!(n=(a=l.next()).done)&&(r.push(a.value),!t||r.length!==t);n=!0);}catch(e){i=!0,o=e;}finally{try{n||null==l.return||l.return();}finally{if(i)throw o}}return r}};},function(e,t,r){var n=r(8);e.exports=function(e,t){if(e){if("string"==typeof e)return n(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return "Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(r):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?n(e,t):void 0}};},function(e,t){e.exports=function(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n};},function(e,t){e.exports=function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")};},function(e,t,r){var n=r(11),i=r(12);"string"==typeof(i=i.__esModule?i.default:i)&&(i=[[e.i,i,""]]);var o={insert:"head",singleton:!1};n(i,o);e.exports=i.locals||{};},function(e,t,r){var n,i=function(){return void 0===n&&(n=Boolean(window&&document&&document.all&&!window.atob)),n},o=function(){var e={};return function(t){if(void 0===e[t]){var r=document.querySelector(t);if(window.HTMLIFrameElement&&r instanceof window.HTMLIFrameElement)try{r=r.contentDocument.head;}catch(e){r=null;}e[t]=r;}return e[t]}}(),a=[];function l(e){for(var t=-1,r=0;r<a.length;r++)if(a[r].identifier===e){t=r;break}return t}function c(e,t){for(var r={},n=[],i=0;i<e.length;i++){var o=e[i],c=t.base?o[0]+t.base:o[0],s=r[c]||0,d="".concat(c," ").concat(s);r[c]=s+1;var u=l(d),h={css:o[1],media:o[2],sourceMap:o[3]};-1!==u?(a[u].references++,a[u].updater(h)):a.push({identifier:d,updater:b(h,t),references:1}),n.push(d);}return n}function s(e){var t=document.createElement("style"),n=e.attributes||{};if(void 0===n.nonce){var i=r.nc;i&&(n.nonce=i);}if(Object.keys(n).forEach((function(e){t.setAttribute(e,n[e]);})),"function"==typeof e.insert)e.insert(t);else {var a=o(e.insert||"head");if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(t);}return t}var d,u=(d=[],function(e,t){return d[e]=t,d.filter(Boolean).join("\n")});function h(e,t,r,n){var i=r?"":n.media?"@media ".concat(n.media," {").concat(n.css,"}"):n.css;if(e.styleSheet)e.styleSheet.cssText=u(t,i);else {var o=document.createTextNode(i),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(o,a[t]):e.appendChild(o);}}function m(e,t,r){var n=r.css,i=r.media,o=r.sourceMap;if(i?e.setAttribute("media",i):e.removeAttribute("media"),o&&btoa&&(n+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(o))))," */")),e.styleSheet)e.styleSheet.cssText=n;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(n));}}var f=null,p=0;function b(e,t){var r,n,i;if(t.singleton){var o=p++;r=f||(f=s(t)),n=h.bind(null,r,o,!1),i=h.bind(null,r,o,!0);}else r=s(t),n=m.bind(null,r,t),i=function(){!function(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);}(r);};return n(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;n(e=t);}else i();}}e.exports=function(e,t){(t=t||{}).singleton||"boolean"==typeof t.singleton||(t.singleton=i());var r=c(e=e||[],t);return function(e){if(e=e||[],"[object Array]"===Object.prototype.toString.call(e)){for(var n=0;n<r.length;n++){var i=l(r[n]);a[i].references--;}for(var o=c(e,t),s=0;s<r.length;s++){var d=l(r[s]);0===a[d].references&&(a[d].updater(),a.splice(d,1));}r=o;}}};},function(e,t,r){(t=r(13)(!1)).push([e.i,".embed-tool--loading .embed-tool__caption {\n      display: none;\n    }\n\n    .embed-tool--loading .embed-tool__preloader {\n      display: block;\n    }\n\n    .embed-tool--loading .embed-tool__content {\n      display: none;\n    }\n  .embed-tool__preloader {\n    display: none;\n    position: relative;\n    height: 200px;\n    box-sizing: border-box;\n    border-radius: 5px;\n    border: 1px solid #e6e9eb;\n  }\n  .embed-tool__preloader::before {\n      content: '';\n      position: absolute;\n      z-index: 3;\n      left: 50%;\n      top: 50%;\n      width: 30px;\n      height: 30px;\n      margin-top: -25px;\n      margin-left: -15px;\n      border-radius: 50%;\n      border: 2px solid #cdd1e0;\n      border-top-color: #388ae5;\n      box-sizing: border-box;\n      animation: embed-preloader-spin 2s infinite linear;\n    }\n  .embed-tool__url {\n    position: absolute;\n    bottom: 20px;\n    left: 50%;\n    transform: translateX(-50%);\n    max-width: 250px;\n    color: #7b7e89;\n    font-size: 11px;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n  .embed-tool__content {\n    width: 100%;\n  }\n  .embed-tool__caption {\n    margin-top: 7px;\n  }\n  .embed-tool__caption[contentEditable=true][data-placeholder]::before{\n      position: absolute;\n      content: attr(data-placeholder);\n      color: #707684;\n      font-weight: normal;\n      opacity: 0;\n    }\n  .embed-tool__caption[contentEditable=true][data-placeholder]:empty::before {\n         opacity: 1;\n      }\n  .embed-tool__caption[contentEditable=true][data-placeholder]:empty:focus::before {\n        opacity: 0;\n      }\n\n@keyframes embed-preloader-spin {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n",""]),e.exports=t;},function(e,t,r){e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var r=function(e,t){var r=e[1]||"",n=e[3];if(!n)return r;if(t&&"function"==typeof btoa){var i=(a=n,l=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),c="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(l),"/*# ".concat(c," */")),o=n.sources.map((function(e){return "/*# sourceURL=".concat(n.sourceRoot||"").concat(e," */")}));return [r].concat(o).concat([i]).join("\n")}var a,l,c;return [r].join("\n")}(t,e);return t[2]?"@media ".concat(t[2]," {").concat(r,"}"):r})).join("")},t.i=function(e,r,n){"string"==typeof e&&(e=[[null,e,""]]);var i={};if(n)for(var o=0;o<this.length;o++){var a=this[o][0];null!=a&&(i[a]=!0);}for(var l=0;l<e.length;l++){var c=[].concat(e[l]);n&&i[c[0]]||(r&&(c[2]?c[2]="".concat(r," and ").concat(c[2]):c[2]=r),t.push(c));}},t};},function(e,t,r){r.r(t),r.d(t,"default",(function(){return m}));var n=r(1),i=r.n(n),o=r(0),a=r.n(o),l=r(2),c=r.n(l),s=r(3),d=r.n(s),u={vimeo:{regex:/(?:http[s]?:\/\/)?(?:www.)?(?:player.)?vimeo\.co(?:.+\/([^\/]\d+)(?:#t=[\d]+)?s?$)/,embedUrl:"https://player.vimeo.com/video/<%= remote_id %>?title=0&byline=0",html:'<iframe style="width:100%;" height="320" frameborder="0"></iframe>',height:320,width:580},youtube:{regex:/(?:https?:\/\/)?(?:www\.)?(?:(?:youtu\.be\/)|(?:youtube\.com)\/(?:v\/|u\/\w\/|embed\/|watch))(?:(?:\?v=)?([^#&?=]*))?((?:[?&]\w*=\w*)*)/,embedUrl:"https://www.youtube.com/embed/<%= remote_id %>",html:'<iframe style="width:100%;" height="320" frameborder="0" allowfullscreen></iframe>',height:320,width:580,id:function(e){var t=a()(e,2),r=t[0],n=t[1];if(!n&&r)return r;var i={start:"start",end:"end",t:"start",time_continue:"start",list:"list"};return n=n.slice(1).split("&").map((function(e){var t=e.split("="),n=a()(t,2),o=n[0],l=n[1];return r||"v"!==o?i[o]?"LL"===l||l.startsWith("RDMM")||l.startsWith("FL")?null:"".concat(i[o],"=").concat(l):null:(r=l,null)})).filter((function(e){return !!e})),r+"?"+n.join("&")}},coub:{regex:/https?:\/\/coub\.com\/view\/([^\/\?\&]+)/,embedUrl:"https://coub.com/embed/<%= remote_id %>",html:'<iframe style="width:100%;" height="320" frameborder="0" allowfullscreen></iframe>',height:320,width:580},vine:{regex:/https?:\/\/vine\.co\/v\/([^\/\?\&]+)/,embedUrl:"https://vine.co/v/<%= remote_id %>/embed/simple/",html:'<iframe style="width:100%;" height="320" frameborder="0" allowfullscreen></iframe>',height:320,width:580},imgur:{regex:/https?:\/\/(?:i\.)?imgur\.com.*\/([a-zA-Z0-9]+)(?:\.gifv)?/,embedUrl:"http://imgur.com/<%= remote_id %>/embed",html:'<iframe allowfullscreen="true" scrolling="no" id="imgur-embed-iframe-pub-<%= remote_id %>" class="imgur-embed-iframe-pub" style="height: 500px; width: 100%; border: 1px solid #000"></iframe>',height:500,width:540},gfycat:{regex:/https?:\/\/gfycat\.com(?:\/detail)?\/([a-zA-Z]+)/,embedUrl:"https://gfycat.com/ifr/<%= remote_id %>",html:"<iframe frameborder='0' scrolling='no' style=\"width:100%;\" height='436' allowfullscreen ></iframe>",height:436,width:580},"twitch-channel":{regex:/https?:\/\/www\.twitch\.tv\/([^\/\?\&]*)\/?$/,embedUrl:"https://player.twitch.tv/?channel=<%= remote_id %>",html:'<iframe frameborder="0" allowfullscreen="true" scrolling="no" height="366" style="width:100%;"></iframe>',height:366,width:600},"twitch-video":{regex:/https?:\/\/www\.twitch\.tv\/(?:[^\/\?\&]*\/v|videos)\/([0-9]*)/,embedUrl:"https://player.twitch.tv/?video=v<%= remote_id %>",html:'<iframe frameborder="0" allowfullscreen="true" scrolling="no" height="366" style="width:100%;"></iframe>',height:366,width:600},"yandex-music-album":{regex:/https?:\/\/music\.yandex\.ru\/album\/([0-9]*)\/?$/,embedUrl:"https://music.yandex.ru/iframe/#album/<%= remote_id %>/",html:'<iframe frameborder="0" style="border:none;width:540px;height:400px;" style="width:100%;" height="400"></iframe>',height:400,width:540},"yandex-music-track":{regex:/https?:\/\/music\.yandex\.ru\/album\/([0-9]*)\/track\/([0-9]*)/,embedUrl:"https://music.yandex.ru/iframe/#track/<%= remote_id %>/",html:'<iframe frameborder="0" style="border:none;width:540px;height:100px;" style="width:100%;" height="100"></iframe>',height:100,width:540,id:function(e){return e.join("/")}},"yandex-music-playlist":{regex:/https?:\/\/music\.yandex\.ru\/users\/([^\/\?\&]*)\/playlists\/([0-9]*)/,embedUrl:"https://music.yandex.ru/iframe/#playlist/<%= remote_id %>/show/cover/description/",html:'<iframe frameborder="0" style="border:none;width:540px;height:400px;" width="540" height="400"></iframe>',height:400,width:540,id:function(e){return e.join("/")}},codepen:{regex:/https?:\/\/codepen\.io\/([^\/\?\&]*)\/pen\/([^\/\?\&]*)/,embedUrl:"https://codepen.io/<%= remote_id %>?height=300&theme-id=0&default-tab=css,result&embed-version=2",html:"<iframe height='300' scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;'></iframe>",height:300,width:600,id:function(e){return e.join("/embed/")}},instagram:{regex:/https?:\/\/www\.instagram\.com\/p\/([^\/\?\&]+)\/?.*/,embedUrl:"https://www.instagram.com/p/<%= remote_id %>/embed",html:'<iframe width="400" height="505" style="margin: 0 auto;" frameborder="0" scrolling="no" allowtransparency="true"></iframe>',height:505,width:400},twitter:{regex:/^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+?.*)?$/,embedUrl:"https://twitframe.com/show?url=https://twitter.com/<%= remote_id %>",html:'<iframe width="600" height="600" style="margin: 0 auto;" frameborder="0" scrolling="no" allowtransparency="true"></iframe>',height:300,width:600,id:function(e){return e.join("/status/")}},pinterest:{regex:/https?:\/\/([^\/\?\&]*).pinterest.com\/pin\/([^\/\?\&]*)\/?$/,embedUrl:"https://assets.pinterest.com/ext/embed.html?id=<%= remote_id %>",html:"<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%; min-height: 400px; max-height: 1000px;'></iframe>",id:function(e){return e[1]}},facebook:{regex:/https?:\/\/www.facebook.com\/([^\/\?\&]*)\/(.*)/,embedUrl:"https://www.facebook.com/plugins/post.php?href=https://www.facebook.com/<%= remote_id %>&width=500",html:"<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%; min-height: 500px; max-height: 1000px;'></iframe>",id:function(e){return e.join("/")}},aparat:{regex:/(?:http[s]?:\/\/)?(?:www.)?aparat\.com\/v\/([^\/\?\&]+)\/?/,embedUrl:"https://www.aparat.com/video/video/embed/videohash/<%= remote_id %>/vt/frame",html:'<iframe width="600" height="300" style="margin: 0 auto;" frameborder="0" scrolling="no" allowtransparency="true"></iframe>',height:300,width:600},miro:{regex:/https:\/\/miro.com\/\S+(\S{12})\/(\S+)?/,embedUrl:"https://miro.com/app/live-embed/<%= remote_id %>",html:'<iframe width="700" height="500" style="margin: 0 auto;" allowFullScreen frameBorder="0" scrolling="no"></iframe>'},github:{regex:/https?:\/\/gist.github.com\/([^\/\?\&]*)\/([^\/\?\&]*)/,embedUrl:'data:text/html;charset=utf-8,<head><base target="_blank" /></head><body><script src="https://gist.github.com/<%= remote_id %>" ><\/script></body>',html:'<iframe width="100%" height="350" frameborder="0" style="margin: 0 auto;"></iframe>',height:300,width:600,id:function(e){return "".concat(e.join("/"),".js")}}},h=(r(10),r(4)),m=function(){function e(t){var r=t.data,n=t.api,i=t.readOnly;c()(this,e),this.api=n,this._data={},this.element=null,this.readOnly=i,this.data=r;}return d()(e,[{key:"render",value:function(){var t=this;if(!this.data.service){var r=document.createElement("div");return this.element=r,r}var n=e.services[this.data.service].html,i=document.createElement("div"),o=document.createElement("div"),a=document.createElement("template"),l=this.createPreloader();i.classList.add(this.CSS.baseClass,this.CSS.container,this.CSS.containerLoading),o.classList.add(this.CSS.input,this.CSS.caption),i.appendChild(l),o.contentEditable=!this.readOnly,o.dataset.placeholder=this.api.i18n.t("Enter a caption"),o.innerHTML=this.data.caption||"",a.innerHTML=n,a.content.firstChild.setAttribute("src",this.data.embed),a.content.firstChild.classList.add(this.CSS.content);var c=this.embedIsReady(i);return i.appendChild(a.content.firstChild),i.appendChild(o),c.then((function(){i.classList.remove(t.CSS.containerLoading);})),this.element=i,i}},{key:"createPreloader",value:function(){var e=document.createElement("preloader"),t=document.createElement("div");return t.textContent=this.data.source,e.classList.add(this.CSS.preloader),t.classList.add(this.CSS.url),e.appendChild(t),e}},{key:"save",value:function(){return this.data}},{key:"onPaste",value:function(t){var r=t.detail,n=r.key,i=r.data,o=e.services[n],a=o.regex,l=o.embedUrl,c=o.width,s=o.height,d=o.id,u=void 0===d?function(e){return e.shift()}:d,h=a.exec(i).slice(1),m=l.replace(/<%= remote_id %>/g,u(h));this.data={service:n,source:i,embed:m,width:c,height:s};}},{key:"embedIsReady",value:function(e){var t=null;return new Promise((function(r,n){(t=new MutationObserver(Object(h.debounce)(r,450))).observe(e,{childList:!0,subtree:!0});})).then((function(){t.disconnect();}))}},{key:"data",set:function(e){if(!(e instanceof Object))throw Error("Embed Tool data should be object");var t=e.service,r=e.source,n=e.embed,i=e.width,o=e.height,a=e.caption,l=void 0===a?"":a;this._data={service:t||this.data.service,source:r||this.data.source,embed:n||this.data.embed,width:i||this.data.width,height:o||this.data.height,caption:l||this.data.caption||""};var c=this.element;c&&c.parentNode.replaceChild(this.render(),c);},get:function(){if(this.element){var e=this.element.querySelector(".".concat(this.api.styles.input));this._data.caption=e?e.innerHTML:"";}return this._data}},{key:"CSS",get:function(){return {baseClass:this.api.styles.block,input:this.api.styles.input,container:"embed-tool",containerLoading:"embed-tool--loading",preloader:"embed-tool__preloader",caption:"embed-tool__caption",url:"embed-tool__url",content:"embed-tool__content"}}}],[{key:"prepare",value:function(t){var r=t.config,n=(void 0===r?{}:r).services,o=void 0===n?{}:n,l=Object.entries(u),c=Object.entries(o).filter((function(e){var t=a()(e,2),r=(t[0],t[1]);return "boolean"==typeof r&&!0===r})).map((function(e){return a()(e,1)[0]})),s=Object.entries(o).filter((function(e){var t=a()(e,2),r=(t[0],t[1]);return "object"===i()(r)})).filter((function(t){var r=a()(t,2),n=(r[0],r[1]);return e.checkServiceConfig(n)})).map((function(e){var t=a()(e,2),r=t[0],n=t[1];return [r,{regex:n.regex,embedUrl:n.embedUrl,html:n.html,height:n.height,width:n.width,id:n.id}]}));c.length&&(l=l.filter((function(e){var t=a()(e,1)[0];return c.includes(t)}))),l=l.concat(s),e.services=l.reduce((function(e,t){var r=a()(t,2),n=r[0],i=r[1];return n in e?(e[n]=Object.assign({},e[n],i),e):(e[n]=i,e)}),{}),e.patterns=l.reduce((function(e,t){var r=a()(t,2),n=r[0],i=r[1];return e[n]=i.regex,e}),{});}},{key:"checkServiceConfig",value:function(e){var t=e.regex,r=e.embedUrl,n=e.html,i=e.height,o=e.width,a=e.id,l=t&&t instanceof RegExp&&r&&"string"==typeof r&&n&&"string"==typeof n;return l=(l=(l=l&&(void 0===a||a instanceof Function))&&(void 0===i||Number.isFinite(i)))&&(void 0===o||Number.isFinite(o))}},{key:"pasteConfig",get:function(){return {patterns:e.patterns}}},{key:"isReadOnlySupported",get:function(){return !0}}]),e}();}]).default})); 
    } (bundle$3));

    var bundleExports$3 = bundle$3.exports;
    var Embed = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$3);

    var editorjsCodeflask_bundle = {exports: {}};

    /*! For license information please see editorjs-codeflask.bundle.js.LICENSE.txt */

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(self,(()=>(()=>{var e={733:(e,t,n)=>{n.d(t,{Z:()=>o});var a=n(81),i=n.n(a),s=n(645),r=n.n(s)()(i());r.push([e.id,'.nice-select{-webkit-tap-highlight-color:rgba(0,0,0,0);background-color:#fff;border-radius:5px;border:solid 1px #e8e8e8;box-sizing:border-box;clear:both;cursor:pointer;display:block;float:left;font-family:inherit;font-size:14px;font-weight:normal;height:38px;line-height:36px;outline:none;padding-left:18px;padding-right:30px;position:relative;text-align:left !important;transition:all .2s ease-in-out;user-select:none;white-space:nowrap;width:auto}.nice-select:hover{border-color:#dbdbdb}.nice-select:active,.nice-select.open,.nice-select:focus{border-color:#999}.nice-select:after{border-bottom:2px solid #999;border-right:2px solid #999;content:"";display:block;height:5px;margin-top:-4px;pointer-events:none;position:absolute;right:12px;top:50%;transform-origin:66% 66%;transform:rotate(45deg);transition:all .15s ease-in-out;width:5px}.nice-select.open:after{transform:rotate(-135deg)}.nice-select.open .nice-select-dropdown{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}.nice-select.disabled{border-color:#ededed;color:#999;pointer-events:none}.nice-select.disabled:after{border-color:#ccc}.nice-select.wide{width:100%}.nice-select.wide .nice-select-dropdown{left:0 !important;right:0 !important}.nice-select.right{float:right}.nice-select.right .nice-select-dropdown{left:auto;right:0}.nice-select.small{font-size:12px;height:36px;line-height:34px}.nice-select.small:after{height:4px;width:4px}.nice-select.small .option{line-height:34px;min-height:34px}.nice-select .nice-select-dropdown{margin-top:4px;background-color:#fff;border-radius:5px;box-shadow:0 0 0 1px rgba(68,68,68,.11);pointer-events:none;position:absolute;top:100%;left:0;transform-origin:50% 0;transform:scale(0.75) translateY(19px);transition:all .2s cubic-bezier(0.5, 0, 0, 1.25),opacity .15s ease-out;z-index:9;opacity:0}.nice-select .list{border-radius:5px;box-sizing:border-box;overflow:hidden;padding:0;max-height:210px;overflow-y:auto}.nice-select .list:hover .option:not(:hover){background-color:transparent !important}.nice-select .option{cursor:pointer;font-weight:400;line-height:40px;list-style:none;outline:none;padding-left:18px;padding-right:29px;text-align:left;transition:all .2s}.nice-select .option:hover,.nice-select .option.focus,.nice-select .option.selected.focus{background-color:#f6f6f6}.nice-select .option.selected{font-weight:bold}.nice-select .option.disabled{background-color:transparent;color:#999;cursor:default}.nice-select .optgroup{font-weight:bold}.no-csspointerevents .nice-select .nice-select-dropdown{display:none}.no-csspointerevents .nice-select.open .nice-select-dropdown{display:block}.nice-select .list::-webkit-scrollbar{width:0}.nice-select .has-multiple{white-space:inherit;height:auto;padding:7px 12px;min-height:36px;line-height:22px}.nice-select .has-multiple span.current{border:1px solid #ccc;background:#eee;padding:0 10px;border-radius:3px;display:inline-block;line-height:24px;font-size:14px;margin-bottom:3px;margin-right:3px}.nice-select .has-multiple .multiple-options{display:block;line-height:24px;padding:0}.nice-select .nice-select-search-box{box-sizing:border-box;width:100%;padding:5px;pointer-events:none;border-radius:5px 5px 0 0}.nice-select .nice-select-search{box-sizing:border-box;background-color:#fff;border:1px solid #e8e8e8;border-radius:3px;color:#444;display:inline-block;vertical-align:middle;padding:7px 12px;margin:0 10px 0 0;width:100%;min-height:36px;line-height:22px;height:auto;outline:0 !important;font-size:14px}\r\n',""]);const o=r;},738:(e,t,n)=>{n.d(t,{Z:()=>o});var a=n(81),i=n.n(a),s=n(645),r=n.n(s)()(i());r.push([e.id,".editorjs-codeFlask_Wrapper {\n    height: 200px;\n\tborder: 1px solid #dcdfe6;\n\tborder-radius: 5px;\n\tbackground-color: #f0f2f5;\n    margin-bottom: 10px;\n}\n\n.editorjs-codeFlask_Wrapper .codeflask {\n\tborder-radius: 5px;\n\tbackground: none;\n}\n\n\n.editorjs-codeFlask_Wrapper .editorjs-codeFlask_LangDisplay {\n\tposition: absolute;\n\theight: 20px;\n\tline-height: 20px;\n\tfont-size: 10px;\n\tcolor: #999;\n\tbackground-color: #dcdfe6;\n\tpadding: 5px;\n\tpadding-left: 10px;\n\tpadding-right: 10px;\n\tright: 0;\n\tbottom: 0;\n\tborder-bottom-right-radius: 5px;\n\tborder-top-left-radius: 5px;\n}\n\n.editorjs-codeFlask_Wrapper .codeflask.codeflask--has-line-numbers:before{\n    background-color: #dcdfe6;\n}",""]);const o=r;},645:e=>{e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n="",a=void 0!==t[5];return t[4]&&(n+="@supports (".concat(t[4],") {")),t[2]&&(n+="@media ".concat(t[2]," {")),a&&(n+="@layer".concat(t[5].length>0?" ".concat(t[5]):""," {")),n+=e(t),a&&(n+="}"),t[2]&&(n+="}"),t[4]&&(n+="}"),n})).join("")},t.i=function(e,n,a,i,s){"string"==typeof e&&(e=[[null,e,void 0]]);var r={};if(a)for(var o=0;o<this.length;o++){var l=this[o][0];null!=l&&(r[l]=!0);}for(var d=0;d<e.length;d++){var c=[].concat(e[d]);a&&r[c[0]]||(void 0!==s&&(void 0===c[5]||(c[1]="@layer".concat(c[5].length>0?" ".concat(c[5]):""," {").concat(c[1],"}")),c[5]=s),n&&(c[2]?(c[1]="@media ".concat(c[2]," {").concat(c[1],"}"),c[2]=n):c[2]=n),i&&(c[4]?(c[1]="@supports (".concat(c[4],") {").concat(c[1],"}"),c[4]=i):c[4]="".concat(i)),t.push(c));}},t};},81:e=>{e.exports=function(e){return e[1]};},668:e=>{e.exports=(()=>{var e={d:(t,n)=>{for(var a in n)e.o(n,a)&&!e.o(t,a)&&Object.defineProperty(t,a,{enumerable:!0,get:n[a]});},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});}},t={};function n(e){var t=document.createEvent("MouseEvents");t.initEvent("click",!0,!1),e.dispatchEvent(t);}function a(e){var t=document.createEvent("HTMLEvents");t.initEvent("change",!0,!1),e.dispatchEvent(t);}function i(e){var t=document.createEvent("FocusEvent");t.initEvent("focusin",!0,!1),e.dispatchEvent(t);}function s(e){var t=document.createEvent("FocusEvent");t.initEvent("focusout",!0,!1),e.dispatchEvent(t);}function r(e,t){return e.getAttribute(t)}function o(e,t){return !!e&&e.classList.contains(t)}function l(e,t){if(e)return e.classList.add(t)}function d(e,t){if(e)return e.classList.remove(t)}e.r(t),e.d(t,{default:()=>u,bind:()=>p});var c={data:null,searchable:!1};function u(e,t){this.el=e,this.config=Object.assign({},c,t||{}),this.data=this.config.data,this.selectedOptions=[],this.placeholder=r(this.el,"placeholder")||this.config.placeholder||"Select an option",this.dropdown=null,this.multiple=r(this.el,"multiple"),this.disabled=r(this.el,"disabled"),this.create();}function p(e,t){return new u(e,t)}return u.prototype.create=function(){this.el.style.display="none",this.data?this.processData(this.data):this.extractData(),this.renderDropdown(),this.bindEvent();},u.prototype.processData=function(e){var t=[];e.forEach((e=>{t.push({data:e,attributes:{selected:!1,disabled:!1,optgroup:"optgroup"==e.value}});})),this.options=t;},u.prototype.extractData=function(){var e=this.el.querySelectorAll("option,optgroup"),t=[],n=[],a=[];e.forEach((e=>{if("OPTGROUP"==e.tagName)var a={text:e.label,value:"optgroup"};else a={text:e.innerText,value:e.value};var i={selected:null!=e.getAttribute("selected"),disabled:null!=e.getAttribute("disabled"),optgroup:"OPTGROUP"==e.tagName};t.push(a),n.push({data:a,attributes:i});})),this.data=t,this.options=n,this.options.forEach((function(e){e.attributes.selected&&a.push(e);})),this.selectedOptions=a;},u.prototype.renderDropdown=function(){var e=`<div class="${["nice-select",r(this.el,"class")||"",this.disabled?"disabled":"",this.multiple?"has-multiple":""].join(" ")}" tabindex="${this.disabled?null:0}">\n  <span class="${this.multiple?"multiple-options":"current"}"></span>\n  <div class="nice-select-dropdown">\n  ${this.config.searchable?'<div class="nice-select-search-box">\n<input type="text" class="nice-select-search" placeholder="Search..."/>\n</div>':""}\n  <ul class="list"></ul>\n  </div></div>\n`;this.el.insertAdjacentHTML("afterend",e),this.dropdown=this.el.nextElementSibling,this._renderSelectedItems(),this._renderItems();},u.prototype._renderSelectedItems=function(){if(this.multiple){var e="";"auto"==window.getComputedStyle(this.dropdown).width||this.selectedOptions.length<2?(this.selectedOptions.forEach((function(t){e+=`<span class="current">${t.data.text}</span>`;})),e=""==e?this.placeholder:e):e=this.selectedOptions.length+" selected",this.dropdown.querySelector(".multiple-options").innerHTML=e;}else {var t=this.selectedOptions.length>0?this.selectedOptions[0].data.text:this.placeholder;this.dropdown.querySelector(".current").innerHTML=t;}},u.prototype._renderItems=function(){var e=this.dropdown.querySelector("ul");this.options.forEach((t=>{e.appendChild(this._renderItem(t));}));},u.prototype._renderItem=function(e){var t=document.createElement("li");if(t.innerHTML=e.data.text,e.attributes.optgroup)t.classList.add("optgroup");else {t.setAttribute("data-value",e.data.value);var n=["option",e.attributes.selected?"selected":null,e.attributes.disabled?"disabled":null];t.addEventListener("click",this._onItemClicked.bind(this,e)),t.classList.add(...n);}return e.element=t,t},u.prototype.update=function(){if(this.extractData(),this.dropdown){var e=o(this.dropdown,"open");this.dropdown.parentNode.removeChild(this.dropdown),this.create(),e&&n(this.dropdown);}},u.prototype.disable=function(){this.disabled||(this.disabled=!0,l(this.dropdown,"disabled"));},u.prototype.enable=function(){this.disabled&&(this.disabled=!1,d(this.dropdown,"disabled"));},u.prototype.clear=function(){this.selectedOptions=[],this._renderSelectedItems(),this.updateSelectValue(),a(this.el);},u.prototype.destroy=function(){this.dropdown&&(this.dropdown.parentNode.removeChild(this.dropdown),this.el.style.display="");},u.prototype.bindEvent=function(){this.dropdown.addEventListener("click",this._onClicked.bind(this)),this.dropdown.addEventListener("keydown",this._onKeyPressed.bind(this)),this.dropdown.addEventListener("focusin",i.bind(this,this.el)),this.dropdown.addEventListener("focusout",s.bind(this,this.el)),window.addEventListener("click",this._onClickedOutside.bind(this)),this.config.searchable&&this._bindSearchEvent();},u.prototype._bindSearchEvent=function(){var e=this.dropdown.querySelector(".nice-select-search");e&&e.addEventListener("click",(function(e){return e.stopPropagation(),!1})),e.addEventListener("input",this._onSearchChanged.bind(this));},u.prototype._onClicked=function(e){if(this.multiple?this.dropdown.classList.add("open"):this.dropdown.classList.toggle("open"),this.dropdown.classList.contains("open")){var t=this.dropdown.querySelector(".nice-select-search");t&&(t.value="",t.focus());var n=this.dropdown.querySelector(".focus");d(n,"focus"),l(n=this.dropdown.querySelector(".selected"),"focus"),this.dropdown.querySelectorAll("ul li").forEach((function(e){e.style.display="";}));}else this.dropdown.focus();},u.prototype._onItemClicked=function(e,t){var n=t.target;o(n,"disabled")||(this.multiple?o(n,"selected")?(d(n,"selected"),this.selectedOptions.splice(this.selectedOptions.indexOf(e),1),this.el.querySelector('option[value="'+n.dataset.value+'"]').selected=!1):(l(n,"selected"),this.selectedOptions.push(e)):(this.selectedOptions.forEach((function(e){d(e.element,"selected");})),l(n,"selected"),this.selectedOptions=[e]),this._renderSelectedItems(),this.updateSelectValue());},u.prototype.updateSelectValue=function(){if(this.multiple){var e=this.el;this.selectedOptions.forEach((function(t){var n=e.querySelector('option[value="'+t.data.value+'"]');n&&n.setAttribute("selected",!0);}));}else this.selectedOptions.length>0&&(this.el.value=this.selectedOptions[0].data.value);a(this.el);},u.prototype._onClickedOutside=function(e){this.dropdown.contains(e.target)||this.dropdown.classList.remove("open");},u.prototype._onKeyPressed=function(e){var t=this.dropdown.querySelector(".focus"),a=this.dropdown.classList.contains("open");if(32==e.keyCode||13==e.keyCode)n(a?t:this.dropdown);else if(40==e.keyCode){if(a){var i=this._findNext(t);i&&(d(this.dropdown.querySelector(".focus"),"focus"),l(i,"focus"));}else n(this.dropdown);e.preventDefault();}else if(38==e.keyCode){if(a){var s=this._findPrev(t);s&&(d(this.dropdown.querySelector(".focus"),"focus"),l(s,"focus"));}else n(this.dropdown);e.preventDefault();}else 27==e.keyCode&&a&&n(this.dropdown);return !1},u.prototype._findNext=function(e){for(e=e?e.nextElementSibling:this.dropdown.querySelector(".list .option");e;){if(!o(e,"disabled")&&"none"!=e.style.display)return e;e=e.nextElementSibling;}return null},u.prototype._findPrev=function(e){for(e=e?e.previousElementSibling:this.dropdown.querySelector(".list .option:last-child");e;){if(!o(e,"disabled")&&"none"!=e.style.display)return e;e=e.previousElementSibling;}return null},u.prototype._onSearchChanged=function(e){var t=this.dropdown.classList.contains("open"),n=e.target.value;if(""==(n=n.toLowerCase()))this.options.forEach((function(e){e.element.style.display="";}));else if(t){var a=new RegExp(n);this.options.forEach((function(e){var t=e.data.text.toLowerCase(),n=a.test(t);e.element.style.display=n?"":"none";}));}this.dropdown.querySelectorAll(".focus").forEach((function(e){d(e,"focus");})),l(this._findNext(null),"focus");},t})();},874:()=>{!function(e){var t="\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b",n={pattern:/(^(["']?)\w+\2)[ \t]+\S.*/,lookbehind:!0,alias:"punctuation",inside:null},a={bash:n,environment:{pattern:RegExp("\\$"+t),alias:"constant"},variable:[{pattern:/\$?\(\([\s\S]+?\)\)/,greedy:!0,inside:{variable:[{pattern:/(^\$\(\([\s\S]+)\)\)/,lookbehind:!0},/^\$\(\(/],number:/\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,operator:/--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,punctuation:/\(\(?|\)\)?|,|;/}},{pattern:/\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,greedy:!0,inside:{variable:/^\$\(|^`|\)$|`$/}},{pattern:/\$\{[^}]+\}/,greedy:!0,inside:{operator:/:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,punctuation:/[\[\]]/,environment:{pattern:RegExp("(\\{)"+t),lookbehind:!0,alias:"constant"}}},/\$(?:\w+|[#?*!@$])/],entity:/\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})/};e.languages.bash={shebang:{pattern:/^#!\s*\/.*/,alias:"important"},comment:{pattern:/(^|[^"{\\$])#.*/,lookbehind:!0},"function-name":[{pattern:/(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,lookbehind:!0,alias:"function"},{pattern:/\b[\w-]+(?=\s*\(\s*\)\s*\{)/,alias:"function"}],"for-or-select":{pattern:/(\b(?:for|select)\s+)\w+(?=\s+in\s)/,alias:"variable",lookbehind:!0},"assign-left":{pattern:/(^|[\s;|&]|[<>]\()\w+(?=\+?=)/,inside:{environment:{pattern:RegExp("(^|[\\s;|&]|[<>]\\()"+t),lookbehind:!0,alias:"constant"}},alias:"variable",lookbehind:!0},string:[{pattern:/((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,lookbehind:!0,greedy:!0,inside:a},{pattern:/((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,lookbehind:!0,greedy:!0,inside:{bash:n}},{pattern:/(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,lookbehind:!0,greedy:!0,inside:a},{pattern:/(^|[^$\\])'[^']*'/,lookbehind:!0,greedy:!0},{pattern:/\$'(?:[^'\\]|\\[\s\S])*'/,greedy:!0,inside:{entity:a.entity}}],environment:{pattern:RegExp("\\$?"+t),alias:"constant"},variable:a.variable,function:{pattern:/(^|[\s;|&]|[<>]\()(?:add|apropos|apt|aptitude|apt-cache|apt-get|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,lookbehind:!0},keyword:{pattern:/(^|[\s;|&]|[<>]\()(?:if|then|else|elif|fi|for|while|in|case|esac|function|select|do|done|until)(?=$|[)\s;|&])/,lookbehind:!0},builtin:{pattern:/(^|[\s;|&]|[<>]\()(?:\.|:|break|cd|continue|eval|exec|exit|export|getopts|hash|pwd|readonly|return|shift|test|times|trap|umask|unset|alias|bind|builtin|caller|command|declare|echo|enable|help|let|local|logout|mapfile|printf|read|readarray|source|type|typeset|ulimit|unalias|set|shopt)(?=$|[)\s;|&])/,lookbehind:!0,alias:"class-name"},boolean:{pattern:/(^|[\s;|&]|[<>]\()(?:true|false)(?=$|[)\s;|&])/,lookbehind:!0},"file-descriptor":{pattern:/\B&\d\b/,alias:"important"},operator:{pattern:/\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,inside:{"file-descriptor":{pattern:/^\d/,alias:"important"}}},punctuation:/\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,number:{pattern:/(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,lookbehind:!0}},n.inside=e.languages.bash;for(var i=["comment","function-name","for-or-select","assign-left","string","environment","function","keyword","builtin","boolean","file-descriptor","operator","punctuation","number"],s=a.variable[1].inside,r=0;r<i.length;r++)s[i[r]]=e.languages.bash[i[r]];e.languages.shell=e.languages.bash;}(Prism);},689:()=>{Prism.languages.iecst={comment:[{pattern:/(^|[^\\])(?:\/\*[\s\S]*?(?:\*\/|$)|\(\*[\s\S]*?(?:\*\)|$)|\{[\s\S]*?(?:\}|$))/,lookbehind:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":/\b(?:END_)?(?:PROGRAM|CONFIGURATION|INTERFACE|FUNCTION_BLOCK|FUNCTION|ACTION|TRANSITION|TYPE|STRUCT|(?:INITIAL_)?STEP|NAMESPACE|LIBRARY|CHANNEL|FOLDER|RESOURCE|VAR_(?:GLOBAL|INPUT|PUTPUT|IN_OUT|ACCESS|TEMP|EXTERNAL|CONFIG)|VAR|METHOD|PROPERTY)\b/i,keyword:/\b(?:(?:END_)?(?:IF|WHILE|REPEAT|CASE|FOR)|ELSE|FROM|THEN|ELSIF|DO|TO|BY|PRIVATE|PUBLIC|PROTECTED|CONSTANT|RETURN|EXIT|CONTINUE|GOTO|JMP|AT|RETAIN|NON_RETAIN|TASK|WITH|UNTIL|USING|EXTENDS|IMPLEMENTS|GET|SET|__TRY|__CATCH|__FINALLY|__ENDTRY)\b/,variable:/\b(?:AT|BOOL|BYTE|(?:D|L)?WORD|U?(?:S|D|L)?INT|L?REAL|TIME(?:_OF_DAY)?|TOD|DT|DATE(?:_AND_TIME)?|STRING|ARRAY|ANY|POINTER)\b/,symbol:/%[IQM][XBWDL][\d.]*|%[IQ][\d.]*/,number:/\b(?:16#[\da-f]+|2#[01_]+|0x[\da-f]+)\b|\b(?:T|D|DT|TOD)#[\d_shmd:]*|\b[A-Z]*#[\d.,_]*|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,boolean:/\b(?:TRUE|FALSE|NULL)\b/,function:/\w+(?=\()/,operator:/(?:S?R?:?=>?|&&?|\*\*?|<=?|>=?|[-:^/+])|\b(?:OR|AND|MOD|NOT|XOR|LE|GE|EQ|NE|GT|LT)\b/,punctuation:/[();]/,type:{pattern:/#/,alias:"selector"}};},277:()=>{Prism.languages.json={property:{pattern:/(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,lookbehind:!0,greedy:!0},string:{pattern:/(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,lookbehind:!0,greedy:!0},comment:{pattern:/\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,greedy:!0},number:/-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,punctuation:/[{}[\],]/,operator:/:/,boolean:/\b(?:true|false)\b/,null:{pattern:/\bnull\b/,alias:"keyword"}},Prism.languages.webmanifest=Prism.languages.json;},64:()=>{!function(e){var t=/(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;function n(e){return e=e.replace(/<inner>/g,(function(){return t})),RegExp(/((?:^|[^\\])(?:\\{2})*)/.source+"(?:"+e+")")}var a=/(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source,i=/\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g,(function(){return a})),s=/\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;e.languages.markdown=e.languages.extend("markup",{}),e.languages.insertBefore("markdown","prolog",{"front-matter-block":{pattern:/(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,lookbehind:!0,greedy:!0,inside:{punctuation:/^---|---$/,"font-matter":{pattern:/\S+(?:\s+\S+)*/,alias:["yaml","language-yaml"],inside:e.languages.yaml}}},blockquote:{pattern:/^>(?:[\t ]*>)*/m,alias:"punctuation"},table:{pattern:RegExp("^"+i+s+"(?:"+i+")*","m"),inside:{"table-data-rows":{pattern:RegExp("^("+i+s+")(?:"+i+")*$"),lookbehind:!0,inside:{"table-data":{pattern:RegExp(a),inside:e.languages.markdown},punctuation:/\|/}},"table-line":{pattern:RegExp("^("+i+")"+s+"$"),lookbehind:!0,inside:{punctuation:/\||:?-{3,}:?/}},"table-header-row":{pattern:RegExp("^"+i+"$"),inside:{"table-header":{pattern:RegExp(a),alias:"important",inside:e.languages.markdown},punctuation:/\|/}}}},code:[{pattern:/((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,lookbehind:!0,alias:"keyword"},{pattern:/^```[\s\S]*?^```$/m,greedy:!0,inside:{"code-block":{pattern:/^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,lookbehind:!0},"code-language":{pattern:/^(```).+/,lookbehind:!0},punctuation:/```/}}],title:[{pattern:/\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,alias:"important",inside:{punctuation:/==+$|--+$/}},{pattern:/(^\s*)#.+/m,lookbehind:!0,alias:"important",inside:{punctuation:/^#+|#+$/}}],hr:{pattern:/(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,lookbehind:!0,alias:"punctuation"},list:{pattern:/(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,lookbehind:!0,alias:"punctuation"},"url-reference":{pattern:/!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,inside:{variable:{pattern:/^(!?\[)[^\]]+/,lookbehind:!0},string:/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,punctuation:/^[\[\]!:]|[<>]/},alias:"url"},bold:{pattern:n(/\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^..)[\s\S]+(?=..$)/,lookbehind:!0,inside:{}},punctuation:/\*\*|__/}},italic:{pattern:n(/\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^.)[\s\S]+(?=.$)/,lookbehind:!0,inside:{}},punctuation:/[*_]/}},strike:{pattern:n(/(~~?)(?:(?!~)<inner>)+\2/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^~~?)[\s\S]+(?=\1$)/,lookbehind:!0,inside:{}},punctuation:/~~?/}},"code-snippet":{pattern:/(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,lookbehind:!0,greedy:!0,alias:["code","keyword"]},url:{pattern:n(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source),lookbehind:!0,greedy:!0,inside:{operator:/^!/,content:{pattern:/(^\[)[^\]]+(?=\])/,lookbehind:!0,inside:{}},variable:{pattern:/(^\][ \t]?\[)[^\]]+(?=\]$)/,lookbehind:!0},url:{pattern:/(^\]\()[^\s)]+/,lookbehind:!0},string:{pattern:/(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,lookbehind:!0}}}}),["url","bold","italic","strike"].forEach((function(t){["url","bold","italic","strike","code-snippet"].forEach((function(n){t!==n&&(e.languages.markdown[t].inside.content.inside[n]=e.languages.markdown[n]);}));})),e.hooks.add("after-tokenize",(function(e){"markdown"!==e.language&&"md"!==e.language||function e(t){if(t&&"string"!=typeof t)for(var n=0,a=t.length;n<a;n++){var i=t[n];if("code"===i.type){var s=i.content[1],r=i.content[3];if(s&&r&&"code-language"===s.type&&"code-block"===r.type&&"string"==typeof s.content){var o=s.content.replace(/\b#/g,"sharp").replace(/\b\+\+/g,"pp"),l="language-"+(o=(/[a-z][\w-]*/i.exec(o)||[""])[0].toLowerCase());r.alias?"string"==typeof r.alias?r.alias=[r.alias,l]:r.alias.push(l):r.alias=[l];}}else e(i.content);}}(e.tokens);})),e.hooks.add("wrap",(function(t){if("code-block"===t.type){for(var n="",a=0,i=t.classes.length;a<i;a++){var s=t.classes[a],d=/language-(.+)/.exec(s);if(d){n=d[1];break}}var c=e.languages[n];if(c)t.content=e.highlight(t.content.replace(r,"").replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi,(function(e,t){var n;return "#"===(t=t.toLowerCase())[0]?(n="x"===t[1]?parseInt(t.slice(2),16):Number(t.slice(1)),l(n)):o[t]||e})),c,n);else if(n&&"none"!==n&&e.plugins.autoloader){var u="md-"+(new Date).valueOf()+"-"+Math.floor(1e16*Math.random());t.attributes.id=u,e.plugins.autoloader.loadLanguages(n,(function(){var t=document.getElementById(u);t&&(t.innerHTML=e.highlight(t.textContent,e.languages[n],n));}));}}}));var r=RegExp(e.languages.markup.tag.pattern.source,"gi"),o={amp:"&",lt:"<",gt:">",quot:'"'},l=String.fromCodePoint||String.fromCharCode;e.languages.md=e.languages.markdown;}(Prism);},335:()=>{Prism.languages.markup={comment:/<!--[\s\S]*?-->/,prolog:/<\?[\s\S]+?\?>/,doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/,name:/[^\s<>'"]+/}},cdata:/<!\[CDATA\[[\s\S]*?\]\]>/i,tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\da-f]{1,8};/i]},Prism.languages.markup.tag.inside["attr-value"].inside.entity=Prism.languages.markup.entity,Prism.languages.markup.doctype.inside["internal-subset"].inside=Prism.languages.markup,Prism.hooks.add("wrap",(function(e){"entity"===e.type&&(e.attributes.title=e.content.replace(/&amp;/,"&"));})),Object.defineProperty(Prism.languages.markup.tag,"addInlined",{value:function(e,t){var n={};n["language-"+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:Prism.languages[t]},n.cdata=/^<!\[CDATA\[|\]\]>$/i;var a={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:n}};a["language-"+t]={pattern:/[\s\S]+/,inside:Prism.languages[t]};var i={};i[e]={pattern:RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g,(function(){return e})),"i"),lookbehind:!0,greedy:!0,inside:a},Prism.languages.insertBefore("markup","cdata",i);}}),Object.defineProperty(Prism.languages.markup.tag,"addAttribute",{value:function(e,t){Prism.languages.markup.tag.inside["special-attr"].push({pattern:RegExp(/(^|["'\s])/.source+"(?:"+e+")"+/\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,"i"),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,"language-"+t],inside:Prism.languages[t]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}}}});}}),Prism.languages.html=Prism.languages.markup,Prism.languages.mathml=Prism.languages.markup,Prism.languages.svg=Prism.languages.markup,Prism.languages.xml=Prism.languages.extend("markup",{}),Prism.languages.ssml=Prism.languages.xml,Prism.languages.atom=Prism.languages.xml,Prism.languages.rss=Prism.languages.xml;},366:()=>{Prism.languages.python={comment:{pattern:/(^|[^\\])#.*/,lookbehind:!0},"string-interpolation":{pattern:/(?:f|rf|fr)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,greedy:!0,inside:{interpolation:{pattern:/((?:^|[^{])(?:\{\{)*)\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}])+\})+\})+\}/,lookbehind:!0,inside:{"format-spec":{pattern:/(:)[^:(){}]+(?=\}$)/,lookbehind:!0},"conversion-option":{pattern:/![sra](?=[:}]$)/,alias:"punctuation"},rest:null}},string:/[\s\S]+/}},"triple-quoted-string":{pattern:/(?:[rub]|rb|br)?("""|''')[\s\S]*?\1/i,greedy:!0,alias:"string"},string:{pattern:/(?:[rub]|rb|br)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,greedy:!0},function:{pattern:/((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,lookbehind:!0},"class-name":{pattern:/(\bclass\s+)\w+/i,lookbehind:!0},decorator:{pattern:/(^[\t ]*)@\w+(?:\.\w+)*/im,lookbehind:!0,alias:["annotation","punctuation"],inside:{punctuation:/\./}},keyword:/\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,builtin:/\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,boolean:/\b(?:True|False|None)\b/,number:/(?:\b(?=\d)|\B(?=\.))(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?j?\b/i,operator:/[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,punctuation:/[{}[\];(),.:]/},Prism.languages.python["string-interpolation"].inside.interpolation.inside.rest=Prism.languages.python,Prism.languages.py=Prism.languages.python;},660:(e,t,n)=>{var a=function(e){var t=/\blang(?:uage)?-([\w-]+)\b/i,n=0,a={},i={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){return t instanceof s?new s(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function e(t,n){var a,s;switch(n=n||{},i.util.type(t)){case"Object":if(s=i.util.objId(t),n[s])return n[s];for(var r in a={},n[s]=a,t)t.hasOwnProperty(r)&&(a[r]=e(t[r],n));return a;case"Array":return s=i.util.objId(t),n[s]?n[s]:(a=[],n[s]=a,t.forEach((function(t,i){a[i]=e(t,n);})),a);default:return t}},getLanguage:function(e){for(;e&&!t.test(e.className);)e=e.parentElement;return e?(e.className.match(t)||[,"none"])[1].toLowerCase():"none"},currentScript:function(){if("undefined"==typeof document)return null;if("currentScript"in document)return document.currentScript;try{throw new Error}catch(a){var e=(/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(a.stack)||[])[1];if(e){var t=document.getElementsByTagName("script");for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(var a="no-"+t;e;){var i=e.classList;if(i.contains(t))return !0;if(i.contains(a))return !1;e=e.parentElement;}return !!n}},languages:{plain:a,plaintext:a,text:a,txt:a,extend:function(e,t){var n=i.util.clone(i.languages[e]);for(var a in t)n[a]=t[a];return n},insertBefore:function(e,t,n,a){var s=(a=a||i.languages)[e],r={};for(var o in s)if(s.hasOwnProperty(o)){if(o==t)for(var l in n)n.hasOwnProperty(l)&&(r[l]=n[l]);n.hasOwnProperty(o)||(r[o]=s[o]);}var d=a[e];return a[e]=r,i.languages.DFS(i.languages,(function(t,n){n===d&&t!=e&&(this[t]=r);})),r},DFS:function e(t,n,a,s){s=s||{};var r=i.util.objId;for(var o in t)if(t.hasOwnProperty(o)){n.call(t,o,t[o],a||o);var l=t[o],d=i.util.type(l);"Object"!==d||s[r(l)]?"Array"!==d||s[r(l)]||(s[r(l)]=!0,e(l,n,o,s)):(s[r(l)]=!0,e(l,n,null,s));}}},plugins:{},highlightAll:function(e,t){i.highlightAllUnder(document,e,t);},highlightAllUnder:function(e,t,n){var a={callback:n,container:e,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};i.hooks.run("before-highlightall",a),a.elements=Array.prototype.slice.apply(a.container.querySelectorAll(a.selector)),i.hooks.run("before-all-elements-highlight",a);for(var s,r=0;s=a.elements[r++];)i.highlightElement(s,!0===t,a.callback);},highlightElement:function(n,a,s){var r=i.util.getLanguage(n),o=i.languages[r];n.className=n.className.replace(t,"").replace(/\s+/g," ")+" language-"+r;var l=n.parentElement;l&&"pre"===l.nodeName.toLowerCase()&&(l.className=l.className.replace(t,"").replace(/\s+/g," ")+" language-"+r);var d={element:n,language:r,grammar:o,code:n.textContent};function c(e){d.highlightedCode=e,i.hooks.run("before-insert",d),d.element.innerHTML=d.highlightedCode,i.hooks.run("after-highlight",d),i.hooks.run("complete",d),s&&s.call(d.element);}if(i.hooks.run("before-sanity-check",d),(l=d.element.parentElement)&&"pre"===l.nodeName.toLowerCase()&&!l.hasAttribute("tabindex")&&l.setAttribute("tabindex","0"),!d.code)return i.hooks.run("complete",d),void(s&&s.call(d.element));if(i.hooks.run("before-highlight",d),d.grammar)if(a&&e.Worker){var u=new Worker(i.filename);u.onmessage=function(e){c(e.data);},u.postMessage(JSON.stringify({language:d.language,code:d.code,immediateClose:!0}));}else c(i.highlight(d.code,d.grammar,d.language));else c(i.util.encode(d.code));},highlight:function(e,t,n){var a={code:e,grammar:t,language:n};return i.hooks.run("before-tokenize",a),a.tokens=i.tokenize(a.code,a.grammar),i.hooks.run("after-tokenize",a),s.stringify(i.util.encode(a.tokens),a.language)},tokenize:function(e,t){var n=t.rest;if(n){for(var a in n)t[a]=n[a];delete t.rest;}var i=new l;return d(i,i.head,e),o(e,i,t,i.head,0),function(e){for(var t=[],n=e.head.next;n!==e.tail;)t.push(n.value),n=n.next;return t}(i)},hooks:{all:{},add:function(e,t){var n=i.hooks.all;n[e]=n[e]||[],n[e].push(t);},run:function(e,t){var n=i.hooks.all[e];if(n&&n.length)for(var a,s=0;a=n[s++];)a(t);}},Token:s};function s(e,t,n,a){this.type=e,this.content=t,this.alias=n,this.length=0|(a||"").length;}function r(e,t,n,a){e.lastIndex=t;var i=e.exec(n);if(i&&a&&i[1]){var s=i[1].length;i.index+=s,i[0]=i[0].slice(s);}return i}function o(e,t,n,a,l,u){for(var p in n)if(n.hasOwnProperty(p)&&n[p]){var g=n[p];g=Array.isArray(g)?g:[g];for(var h=0;h<g.length;++h){if(u&&u.cause==p+","+h)return;var f=g[h],m=f.inside,b=!!f.lookbehind,y=!!f.greedy,v=f.alias;if(y&&!f.pattern.global){var k=f.pattern.toString().match(/[imsuy]*$/)[0];f.pattern=RegExp(f.pattern.source,k+"g");}for(var x=f.pattern||f,w=a.next,S=l;w!==t.tail&&!(u&&S>=u.reach);S+=w.value.length,w=w.next){var E=w.value;if(t.length>e.length)return;if(!(E instanceof s)){var A,_=1;if(y){if(!(A=r(x,S,e,b)))break;var T=A.index,F=A.index+A[0].length,C=S;for(C+=w.value.length;T>=C;)C+=(w=w.next).value.length;if(S=C-=w.value.length,w.value instanceof s)continue;for(var L=w;L!==t.tail&&(C<F||"string"==typeof L.value);L=L.next)_++,C+=L.value.length;_--,E=e.slice(S,C),A.index-=S;}else if(!(A=r(x,0,E,b)))continue;T=A.index;var O=A[0],N=E.slice(0,T),P=E.slice(T+O.length),I=S+E.length;u&&I>u.reach&&(u.reach=I);var $=w.prev;if(N&&($=d(t,$,N),S+=N.length),c(t,$,_),w=d(t,$,new s(p,m?i.tokenize(O,m):O,v,O)),P&&d(t,w,P),_>1){var R={cause:p+","+h,reach:I};o(e,t,n,w.prev,S,R),u&&R.reach>u.reach&&(u.reach=R.reach);}}}}}}function l(){var e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0;}function d(e,t,n){var a=t.next,i={value:n,prev:t,next:a};return t.next=i,a.prev=i,e.length++,i}function c(e,t,n){for(var a=t.next,i=0;i<n&&a!==e.tail;i++)a=a.next;t.next=a,a.prev=t,e.length-=i;}if(e.Prism=i,s.stringify=function e(t,n){if("string"==typeof t)return t;if(Array.isArray(t)){var a="";return t.forEach((function(t){a+=e(t,n);})),a}var s={type:t.type,content:e(t.content,n),tag:"span",classes:["token",t.type],attributes:{},language:n},r=t.alias;r&&(Array.isArray(r)?Array.prototype.push.apply(s.classes,r):s.classes.push(r)),i.hooks.run("wrap",s);var o="";for(var l in s.attributes)o+=" "+l+'="'+(s.attributes[l]||"").replace(/"/g,"&quot;")+'"';return "<"+s.tag+' class="'+s.classes.join(" ")+'"'+o+">"+s.content+"</"+s.tag+">"},!e.document)return e.addEventListener?(i.disableWorkerMessageHandler||e.addEventListener("message",(function(t){var n=JSON.parse(t.data),a=n.language,s=n.code,r=n.immediateClose;e.postMessage(i.highlight(s,i.languages[a],a)),r&&e.close();}),!1),i):i;var u=i.util.currentScript();function p(){i.manual||i.highlightAll();}if(u&&(i.filename=u.src,u.hasAttribute("data-manual")&&(i.manual=!0)),!i.manual){var g=document.readyState;"loading"===g||"interactive"===g&&u&&u.defer?document.addEventListener("DOMContentLoaded",p):window.requestAnimationFrame?window.requestAnimationFrame(p):window.setTimeout(p,16);}return i}("undefined"!=typeof window?window:"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope?self:{});e.exports&&(e.exports=a),void 0!==n.g&&(n.g.Prism=a),a.languages.markup={comment:/<!--[\s\S]*?-->/,prolog:/<\?[\s\S]+?\?>/,doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/,name:/[^\s<>'"]+/}},cdata:/<!\[CDATA\[[\s\S]*?\]\]>/i,tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\da-f]{1,8};/i]},a.languages.markup.tag.inside["attr-value"].inside.entity=a.languages.markup.entity,a.languages.markup.doctype.inside["internal-subset"].inside=a.languages.markup,a.hooks.add("wrap",(function(e){"entity"===e.type&&(e.attributes.title=e.content.replace(/&amp;/,"&"));})),Object.defineProperty(a.languages.markup.tag,"addInlined",{value:function(e,t){var n={};n["language-"+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:a.languages[t]},n.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:n}};i["language-"+t]={pattern:/[\s\S]+/,inside:a.languages[t]};var s={};s[e]={pattern:RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g,(function(){return e})),"i"),lookbehind:!0,greedy:!0,inside:i},a.languages.insertBefore("markup","cdata",s);}}),Object.defineProperty(a.languages.markup.tag,"addAttribute",{value:function(e,t){a.languages.markup.tag.inside["special-attr"].push({pattern:RegExp(/(^|["'\s])/.source+"(?:"+e+")"+/\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,"i"),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,"language-"+t],inside:a.languages[t]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}}}});}}),a.languages.html=a.languages.markup,a.languages.mathml=a.languages.markup,a.languages.svg=a.languages.markup,a.languages.xml=a.languages.extend("markup",{}),a.languages.ssml=a.languages.xml,a.languages.atom=a.languages.xml,a.languages.rss=a.languages.xml,function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:/@[\w-](?:[^;{\s]|\s+(?![\s{]))*(?:;|(?=\s*\{))/,inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\burl\\((?:"+t.source+"|"+/(?:[^\\\r\n()"']|\\[\s\S])*/.source+")\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp("^"+t.source+"$"),alias:"url"}}},selector:{pattern:RegExp("(^|[{}\\s])[^{}\\s](?:[^{};\"'\\s]|\\s+(?![\\s{])|"+t.source+")*(?=\\s*\\{)"),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined("style","css"),n.tag.addAttribute("style","css"));}(a),a.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,boolean:/\b(?:true|false)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},a.languages.javascript=a.languages.extend("clike",{"class-name":[a.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:prototype|constructor))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:/\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),a.languages.javascript["class-name"][0].pattern=/(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/,a.languages.insertBefore("javascript","keyword",{regex:{pattern:/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:a.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:a.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:a.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:a.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:a.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),a.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:"punctuation"},rest:a.languages.javascript}},string:/[\s\S]+/}}}),a.languages.markup&&(a.languages.markup.tag.addInlined("script","javascript"),a.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,"javascript")),a.languages.js=a.languages.javascript,function(){if(void 0!==a&&"undefined"!=typeof document){Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e={js:"javascript",py:"python",rb:"ruby",ps1:"powershell",psm1:"powershell",sh:"bash",bat:"batch",h:"c",tex:"latex"},t="data-src-status",n='pre[data-src]:not([data-src-status="loaded"]):not([data-src-status="loading"])',i=/\blang(?:uage)?-([\w-]+)\b/i;a.hooks.add("before-highlightall",(function(e){e.selector+=", "+n;})),a.hooks.add("before-sanity-check",(function(i){var s=i.element;if(s.matches(n)){i.code="",s.setAttribute(t,"loading");var o=s.appendChild(document.createElement("CODE"));o.textContent="Loading…";var l=s.getAttribute("data-src"),d=i.language;if("none"===d){var c=(/\.(\w+)$/.exec(l)||[,"none"])[1];d=e[c]||c;}r(o,d),r(s,d);var u=a.plugins.autoloader;u&&u.loadLanguages(d);var p=new XMLHttpRequest;p.open("GET",l,!0),p.onreadystatechange=function(){4==p.readyState&&(p.status<400&&p.responseText?(s.setAttribute(t,"loaded"),o.textContent=p.responseText,a.highlightElement(o)):(s.setAttribute(t,"failed"),p.status>=400?o.textContent="✖ Error "+p.status+" while fetching file: "+p.statusText:o.textContent="✖ Error: File does not exist or is empty"));},p.send(null);}})),a.plugins.fileHighlight={highlight:function(e){for(var t,i=(e||document).querySelectorAll(n),s=0;t=i[s++];)a.highlightElement(t);}};var s=!1;a.fileHighlight=function(){s||(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),s=!0),a.plugins.fileHighlight.highlight.apply(this,arguments);};}function r(e,t){var n=e.className;n=n.replace(i," ")+" language-"+t,e.className=n.replace(/\s+/g," ").trim();}}();},379:e=>{var t=[];function n(e){for(var n=-1,a=0;a<t.length;a++)if(t[a].identifier===e){n=a;break}return n}function a(e,a){for(var s={},r=[],o=0;o<e.length;o++){var l=e[o],d=a.base?l[0]+a.base:l[0],c=s[d]||0,u="".concat(d," ").concat(c);s[d]=c+1;var p=n(u),g={css:l[1],media:l[2],sourceMap:l[3],supports:l[4],layer:l[5]};if(-1!==p)t[p].references++,t[p].updater(g);else {var h=i(g,a);a.byIndex=o,t.splice(o,0,{identifier:u,updater:h,references:1});}r.push(u);}return r}function i(e,t){var n=t.domAPI(t);return n.update(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap&&t.supports===e.supports&&t.layer===e.layer)return;n.update(e=t);}else n.remove();}}e.exports=function(e,i){var s=a(e=e||[],i=i||{});return function(e){e=e||[];for(var r=0;r<s.length;r++){var o=n(s[r]);t[o].references--;}for(var l=a(e,i),d=0;d<s.length;d++){var c=n(s[d]);0===t[c].references&&(t[c].updater(),t.splice(c,1));}s=l;}};},569:e=>{var t={};e.exports=function(e,n){var a=function(e){if(void 0===t[e]){var n=document.querySelector(e);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(e){n=null;}t[e]=n;}return t[e]}(e);if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(n);};},216:e=>{e.exports=function(e){var t=document.createElement("style");return e.setAttributes(t,e.attributes),e.insert(t,e.options),t};},565:(e,t,n)=>{e.exports=function(e){var t=n.nc;t&&e.setAttribute("nonce",t);};},795:e=>{e.exports=function(e){var t=e.insertStyleElement(e);return {update:function(n){!function(e,t,n){var a="";n.supports&&(a+="@supports (".concat(n.supports,") {")),n.media&&(a+="@media ".concat(n.media," {"));var i=void 0!==n.layer;i&&(a+="@layer".concat(n.layer.length>0?" ".concat(n.layer):""," {")),a+=n.css,i&&(a+="}"),n.media&&(a+="}"),n.supports&&(a+="}");var s=n.sourceMap;s&&"undefined"!=typeof btoa&&(a+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(s))))," */")),t.styleTagTransform(a,e,t.options);}(t,e,n);},remove:function(){!function(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);}(t);}}};},589:e=>{e.exports=function(e,t){if(t.styleSheet)t.styleSheet.cssText=e;else {for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(e));}};},497:e=>{e.exports='<svg width="14" height="14" viewBox="0 -1 14 14" xmlns="http://www.w3.org/2000/svg"><path d="M3.177 6.852c.205.253.347.572.427.954.078.372.117.844.117 1.417 0 .418.01.725.03.92.02.18.057.314.107.396.046.075.093.117.14.134.075.027.218.056.42.083a.855.855 0 0 1 .56.297c.145.167.215.38.215.636 0 .612-.432.934-1.216.934-.457 0-.87-.087-1.233-.262a1.995 1.995 0 0 1-.853-.751 2.09 2.09 0 0 1-.305-1.097c-.014-.648-.029-1.168-.043-1.56-.013-.383-.034-.631-.06-.733-.064-.263-.158-.455-.276-.578a2.163 2.163 0 0 0-.505-.376c-.238-.134-.41-.256-.519-.371C.058 6.76 0 6.567 0 6.315c0-.37.166-.657.493-.846.329-.186.56-.342.693-.466a.942.942 0 0 0 .26-.447c.056-.2.088-.42.097-.658.01-.25.024-.85.043-1.802.015-.629.239-1.14.672-1.522C2.691.19 3.268 0 3.977 0c.783 0 1.216.317 1.216.921 0 .264-.069.48-.211.643a.858.858 0 0 1-.563.29c-.249.03-.417.076-.498.126-.062.04-.112.134-.139.291-.031.187-.052.562-.061 1.119a8.828 8.828 0 0 1-.112 1.378 2.24 2.24 0 0 1-.404.963c-.159.212-.373.406-.64.583.25.163.454.342.612.538zm7.34 0c.157-.196.362-.375.612-.538a2.544 2.544 0 0 1-.641-.583 2.24 2.24 0 0 1-.404-.963 8.828 8.828 0 0 1-.112-1.378c-.009-.557-.03-.932-.061-1.119-.027-.157-.077-.251-.14-.29-.08-.051-.248-.096-.496-.127a.858.858 0 0 1-.564-.29C8.57 1.401 8.5 1.185 8.5.921 8.5.317 8.933 0 9.716 0c.71 0 1.286.19 1.72.574.432.382.656.893.671 1.522.02.952.033 1.553.043 1.802.009.238.041.458.097.658a.942.942 0 0 0 .26.447c.133.124.364.28.693.466a.926.926 0 0 1 .493.846c0 .252-.058.446-.183.58-.109.115-.281.237-.52.371-.21.118-.377.244-.504.376-.118.123-.212.315-.277.578-.025.102-.045.35-.06.733-.013.392-.027.912-.042 1.56a2.09 2.09 0 0 1-.305 1.097c-.2.323-.486.574-.853.75a2.811 2.811 0 0 1-1.233.263c-.784 0-1.216-.322-1.216-.934 0-.256.07-.47.214-.636a.855.855 0 0 1 .562-.297c.201-.027.344-.056.418-.083.048-.017.096-.06.14-.134a.996.996 0 0 0 .107-.396c.02-.195.031-.502.031-.92 0-.573.039-1.045.117-1.417.08-.382.222-.701.427-.954z"></path></svg>';}},t={};function n(a){var i=t[a];if(void 0!==i)return i.exports;var s=t[a]={id:a,exports:{}};return e[a](s,s.exports,n),s.exports}n.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return n.d(t,{a:t}),t},n.d=(e,t)=>{for(var a in t)n.o(t,a)&&!n.o(e,a)&&Object.defineProperty(e,a,{enumerable:!0,get:t[a]});},n.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t);var a={};return (()=>{n.d(a,{default:()=>$});var e=n(379),t=n.n(e),i=n(795),s=n.n(i),r=n(569),o=n.n(r),l=n(565),d=n.n(l),c=n(216),u=n.n(c),p=n(589),g=n.n(p),h=n(738),f={};f.styleTagTransform=g(),f.setAttributes=d(),f.insert=o().bind(null,"head"),f.domAPI=s(),f.insertStyleElement=u(),t()(h.Z,f),h.Z&&h.Z.locals&&h.Z.locals;var m,b=n(497),y=n.n(b),v=n(660),k=n.n(v),x=(n(689),n(335),n(64),n(277),n(366),n(874),"#fff"),w='"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',S="\n  .codeflask {\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    overflow: hidden;\n  }\n\n  .codeflask, .codeflask * {\n    box-sizing: border-box;\n  }\n\n  .codeflask__pre {\n    pointer-events: none;\n    z-index: 3;\n    overflow: hidden;\n  }\n\n  .codeflask__textarea {\n    background: none;\n    border: none;\n    color: "+(m="caret-color",(("undefined"!=typeof CSS?CSS.supports(m,"#000"):"undefined"!=typeof document&&function(e){return (e=e.split("-").filter((function(e){return !!e})).map((function(e){return e[0].toUpperCase()+e.substr(1)})).join(""))[0].toLowerCase()+e.substr(1)}(m)in document.body.style)?x:"#ccc")+";\n    z-index: 1;\n    resize: none;\n    font-family: ")+w+";\n    -webkit-appearance: pre;\n    caret-color: #111;\n    z-index: 2;\n    width: 100%;\n    height: 100%;\n  }\n\n  .codeflask--has-line-numbers .codeflask__textarea {\n    width: calc(100% - 40px);\n  }\n\n  .codeflask__code {\n    display: block;\n    font-family: "+w+";\n    overflow: hidden;\n  }\n\n  .codeflask__flatten {\n    padding: 10px;\n    font-size: 13px;\n    line-height: 20px;\n    white-space: pre;\n    position: absolute;\n    top: 0;\n    left: 0;\n    overflow: auto;\n    margin: 0 !important;\n    outline: none;\n    text-align: left;\n  }\n\n  .codeflask--has-line-numbers .codeflask__flatten {\n    width: calc(100% - 40px);\n    left: 40px;\n  }\n\n  .codeflask__line-highlight {\n    position: absolute;\n    top: 10px;\n    left: 0;\n    width: 100%;\n    height: 20px;\n    background: rgba(0,0,0,0.1);\n    z-index: 1;\n  }\n\n  .codeflask__lines {\n    padding: 10px 4px;\n    font-size: 12px;\n    line-height: 20px;\n    font-family: 'Cousine', monospace;\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 40px;\n    height: 100%;\n    text-align: right;\n    color: #999;\n    z-index: 2;\n  }\n\n  .codeflask__lines__line {\n    display: block;\n  }\n\n  .codeflask.codeflask--has-line-numbers {\n    padding-left: 40px;\n  }\n\n  .codeflask.codeflask--has-line-numbers:before {\n    content: '';\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 40px;\n    height: 100%;\n    background: #eee;\n    z-index: 1;\n  }\n";function E(e,t,n){var a=t||"codeflask-style",i=n||document.head;if(!e)return !1;if(document.getElementById(a))return !0;var s=document.createElement("style");return s.innerHTML=e,s.id=a,i.appendChild(s),!0}var A={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"};function _(e){return String(e).replace(/[&<>"'`=/]/g,(function(e){return A[e]}))}var T="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:void 0!==n.g?n.g:"undefined"!=typeof self?self:{},F=function(e,t){return function(e){var t=function(e){var t=/\blang(?:uage)?-([\w-]+)\b/i,n=0,a={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function(e){return e instanceof i?new i(e.type,a.util.encode(e.content),e.alias):Array.isArray(e)?e.map(a.util.encode):e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function e(t,n){var i,s,r=a.util.type(t);switch(n=n||{},r){case"Object":if(s=a.util.objId(t),n[s])return n[s];for(var o in i={},n[s]=i,t)t.hasOwnProperty(o)&&(i[o]=e(t[o],n));return i;case"Array":return s=a.util.objId(t),n[s]?n[s]:(i=[],n[s]=i,t.forEach((function(t,a){i[a]=e(t,n);})),i);default:return t}}},languages:{extend:function(e,t){var n=a.util.clone(a.languages[e]);for(var i in t)n[i]=t[i];return n},insertBefore:function(e,t,n,i){var s=(i=i||a.languages)[e],r={};for(var o in s)if(s.hasOwnProperty(o)){if(o==t)for(var l in n)n.hasOwnProperty(l)&&(r[l]=n[l]);n.hasOwnProperty(o)||(r[o]=s[o]);}var d=i[e];return i[e]=r,a.languages.DFS(a.languages,(function(t,n){n===d&&t!=e&&(this[t]=r);})),r},DFS:function e(t,n,i,s){s=s||{};var r=a.util.objId;for(var o in t)if(t.hasOwnProperty(o)){n.call(t,o,t[o],i||o);var l=t[o],d=a.util.type(l);"Object"!==d||s[r(l)]?"Array"!==d||s[r(l)]||(s[r(l)]=!0,e(l,n,o,s)):(s[r(l)]=!0,e(l,n,null,s));}}},plugins:{},highlightAll:function(e,t){a.highlightAllUnder(document,e,t);},highlightAllUnder:function(e,t,n){var i={callback:n,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};a.hooks.run("before-highlightall",i);for(var s,r=i.elements||e.querySelectorAll(i.selector),o=0;s=r[o++];)a.highlightElement(s,!0===t,i.callback);},highlightElement:function(n,i,s){for(var r,o,l=n;l&&!t.test(l.className);)l=l.parentNode;l&&(r=(l.className.match(t)||[,""])[1].toLowerCase(),o=a.languages[r]),n.className=n.className.replace(t,"").replace(/\s+/g," ")+" language-"+r,n.parentNode&&(l=n.parentNode,/pre/i.test(l.nodeName)&&(l.className=l.className.replace(t,"").replace(/\s+/g," ")+" language-"+r));var d={element:n,language:r,grammar:o,code:n.textContent},c=function(e){d.highlightedCode=e,a.hooks.run("before-insert",d),d.element.innerHTML=d.highlightedCode,a.hooks.run("after-highlight",d),a.hooks.run("complete",d),s&&s.call(d.element);};if(a.hooks.run("before-sanity-check",d),d.code)if(a.hooks.run("before-highlight",d),d.grammar)if(i&&e.Worker){var u=new Worker(a.filename);u.onmessage=function(e){c(e.data);},u.postMessage(JSON.stringify({language:d.language,code:d.code,immediateClose:!0}));}else c(a.highlight(d.code,d.grammar,d.language));else c(a.util.encode(d.code));else a.hooks.run("complete",d);},highlight:function(e,t,n){var s={code:e,grammar:t,language:n};return a.hooks.run("before-tokenize",s),s.tokens=a.tokenize(s.code,s.grammar),a.hooks.run("after-tokenize",s),i.stringify(a.util.encode(s.tokens),s.language)},matchGrammar:function(e,t,n,s,r,o,l){for(var d in n)if(n.hasOwnProperty(d)&&n[d]){if(d==l)return;var c=n[d];c="Array"===a.util.type(c)?c:[c];for(var u=0;u<c.length;++u){var p=c[u],g=p.inside,h=!!p.lookbehind,f=!!p.greedy,m=0,b=p.alias;if(f&&!p.pattern.global){var y=p.pattern.toString().match(/[imuy]*$/)[0];p.pattern=RegExp(p.pattern.source,y+"g");}p=p.pattern||p;for(var v=s,k=r;v<t.length;k+=t[v].length,++v){var x=t[v];if(t.length>e.length)return;if(!(x instanceof i)){if(f&&v!=t.length-1){if(p.lastIndex=k,!(T=p.exec(e)))break;for(var w=T.index+(h?T[1].length:0),S=T.index+T[0].length,E=v,A=k,_=t.length;E<_&&(A<S||!t[E].type&&!t[E-1].greedy);++E)w>=(A+=t[E].length)&&(++v,k=A);if(t[v]instanceof i)continue;F=E-v,x=e.slice(k,A),T.index-=k;}else {p.lastIndex=0;var T=p.exec(x),F=1;}if(T){h&&(m=T[1]?T[1].length:0),S=(w=T.index+m)+(T=T[0].slice(m)).length;var C=x.slice(0,w),L=x.slice(S),O=[v,F];C&&(++v,k+=C.length,O.push(C));var N=new i(d,g?a.tokenize(T,g):T,b,T,f);if(O.push(N),L&&O.push(L),Array.prototype.splice.apply(t,O),1!=F&&a.matchGrammar(e,t,n,v,k,!0,d),o)break}else if(o)break}}}}},tokenize:function(e,t){var n=[e],i=t.rest;if(i){for(var s in i)t[s]=i[s];delete t.rest;}return a.matchGrammar(e,n,t,0,0,!1),n},hooks:{all:{},add:function(e,t){var n=a.hooks.all;n[e]=n[e]||[],n[e].push(t);},run:function(e,t){var n=a.hooks.all[e];if(n&&n.length)for(var i,s=0;i=n[s++];)i(t);}},Token:i};function i(e,t,n,a,i){this.type=e,this.content=t,this.alias=n,this.length=0|(a||"").length,this.greedy=!!i;}if(e.Prism=a,i.stringify=function(e,t,n){if("string"==typeof e)return e;if(Array.isArray(e))return e.map((function(n){return i.stringify(n,t,e)})).join("");var s={type:e.type,content:i.stringify(e.content,t,n),tag:"span",classes:["token",e.type],attributes:{},language:t,parent:n};if(e.alias){var r=Array.isArray(e.alias)?e.alias:[e.alias];Array.prototype.push.apply(s.classes,r);}a.hooks.run("wrap",s);var o=Object.keys(s.attributes).map((function(e){return e+'="'+(s.attributes[e]||"").replace(/"/g,"&quot;")+'"'})).join(" ");return "<"+s.tag+' class="'+s.classes.join(" ")+'"'+(o?" "+o:"")+">"+s.content+"</"+s.tag+">"},!e.document)return e.addEventListener?(a.disableWorkerMessageHandler||e.addEventListener("message",(function(t){var n=JSON.parse(t.data),i=n.language,s=n.code,r=n.immediateClose;e.postMessage(a.highlight(s,a.languages[i],i)),r&&e.close();}),!1),a):a;var s=document.currentScript||[].slice.call(document.getElementsByTagName("script")).pop();return s&&(a.filename=s.src,a.manual||s.hasAttribute("data-manual")||("loading"!==document.readyState?window.requestAnimationFrame?window.requestAnimationFrame(a.highlightAll):window.setTimeout(a.highlightAll,16):document.addEventListener("DOMContentLoaded",a.highlightAll))),a}("undefined"!=typeof window?window:"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope?self:{});e.exports&&(e.exports=t),void 0!==T&&(T.Prism=t),t.languages.markup={comment:/<!--[\s\S]*?-->/,prolog:/<\?[\s\S]+?\?>/,doctype:/<!DOCTYPE[\s\S]+?>/i,cdata:/<!\[CDATA\[[\s\S]*?]]>/i,tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/i,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/i,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,inside:{punctuation:[/^=/,{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:/&#?[\da-z]{1,8};/i},t.languages.markup.tag.inside["attr-value"].inside.entity=t.languages.markup.entity,t.hooks.add("wrap",(function(e){"entity"===e.type&&(e.attributes.title=e.content.replace(/&amp;/,"&"));})),Object.defineProperty(t.languages.markup.tag,"addInlined",{value:function(e,n){var a={};a["language-"+n]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:t.languages[n]},a.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:a}};i["language-"+n]={pattern:/[\s\S]+/,inside:t.languages[n]};var s={};s[e]={pattern:RegExp(/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(/__/g,e),"i"),lookbehind:!0,greedy:!0,inside:i},t.languages.insertBefore("markup","cdata",s);}}),t.languages.xml=t.languages.extend("markup",{}),t.languages.html=t.languages.markup,t.languages.mathml=t.languages.markup,t.languages.svg=t.languages.markup,function(e){var t=/("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:/@[\w-]+?[\s\S]*?(?:;|(?=\s*\{))/i,inside:{rule:/@[\w-]+/}},url:RegExp("url\\((?:"+t.source+"|.*?)\\)","i"),selector:RegExp("[^{}\\s](?:[^{};\"']|"+t.source+")*?(?=\\s*\\{)"),string:{pattern:t,greedy:!0},property:/[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,important:/!important\b/i,function:/[-a-z0-9]+(?=\()/i,punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined("style","css"),e.languages.insertBefore("inside","attr-value",{"style-attr":{pattern:/\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,inside:{"attr-name":{pattern:/^\s*style/i,inside:n.tag.inside},punctuation:/^\s*=\s*['"]|['"]\s*$/,"attr-value":{pattern:/.+/i,inside:e.languages.css}},alias:"language-css"}},n.tag));}(t),t.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,boolean:/\b(?:true|false)\b/,function:/\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,punctuation:/[{}[\];(),.:]/},t.languages.javascript=t.languages.extend("clike",{"class-name":[t.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,lookbehind:!0}],keyword:[{pattern:/((?:^|})\s*)(?:catch|finally)\b/,lookbehind:!0},{pattern:/(^|[^.])\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],number:/\b(?:(?:0[xX][\dA-Fa-f]+|0[bB][01]+|0[oO][0-7]+)n?|\d+n|NaN|Infinity)\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee][+-]?\d+)?/,function:/[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,operator:/-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/}),t.languages.javascript["class-name"][0].pattern=/(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/,t.languages.insertBefore("javascript","keyword",{regex:{pattern:/((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})\]]))/,lookbehind:!0,greedy:!0},"function-variable":{pattern:/[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,lookbehind:!0,inside:t.languages.javascript},{pattern:/[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,inside:t.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,lookbehind:!0,inside:t.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,lookbehind:!0,inside:t.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),t.languages.insertBefore("javascript","string",{"template-string":{pattern:/`(?:\\[\s\S]|\${[^}]+}|[^\\`])*`/,greedy:!0,inside:{interpolation:{pattern:/\${[^}]+}/,inside:{"interpolation-punctuation":{pattern:/^\${|}$/,alias:"punctuation"},rest:t.languages.javascript}},string:/[\s\S]+/}}}),t.languages.markup&&t.languages.markup.tag.addInlined("script","javascript"),t.languages.js=t.languages.javascript,"undefined"!=typeof self&&self.Prism&&self.document&&document.querySelector&&(self.Prism.fileHighlight=function(e){e=e||document;var n={js:"javascript",py:"python",rb:"ruby",ps1:"powershell",psm1:"powershell",sh:"bash",bat:"batch",h:"c",tex:"latex"};Array.prototype.slice.call(e.querySelectorAll("pre[data-src]")).forEach((function(e){if(!e.hasAttribute("data-src-loaded")){for(var a,i=e.getAttribute("data-src"),s=e,r=/\blang(?:uage)?-([\w-]+)\b/i;s&&!r.test(s.className);)s=s.parentNode;if(s&&(a=(e.className.match(r)||[,""])[1]),!a){var o=(i.match(/\.(\w+)$/)||[,""])[1];a=n[o]||o;}var l=document.createElement("code");l.className="language-"+a,e.textContent="",l.textContent="Loading…",e.appendChild(l);var d=new XMLHttpRequest;d.open("GET",i,!0),d.onreadystatechange=function(){4==d.readyState&&(d.status<400&&d.responseText?(l.textContent=d.responseText,t.highlightElement(l),e.setAttribute("data-src-loaded","")):d.status>=400?l.textContent="✖ Error "+d.status+" while fetching file: "+d.statusText:l.textContent="✖ Error: File does not exist or is empty");},d.send(null);}})),t.plugins.toolbar&&t.plugins.toolbar.registerButton("download-file",(function(e){var t=e.element.parentNode;if(t&&/pre/i.test(t.nodeName)&&t.hasAttribute("data-src")&&t.hasAttribute("data-download-link")){var n=t.getAttribute("data-src"),a=document.createElement("a");return a.textContent=t.getAttribute("data-download-link-label")||"Download",a.setAttribute("download",""),a.href=n,a}}));},document.addEventListener("DOMContentLoaded",(function(){self.Prism.fileHighlight();})));}(t={exports:{}}),t.exports}(),C=function(e,t){if(!e)throw Error("CodeFlask expects a parameter which is Element or a String selector");if(!t)throw Error("CodeFlask expects an object containing options as second parameter");if(e.nodeType)this.editorRoot=e;else {var n=document.querySelector(e);n&&(this.editorRoot=n);}this.opts=t,this.startEditor();};C.prototype.startEditor=function(){if(!E(S,null,this.opts.styleParent))throw Error("Failed to inject CodeFlask CSS.");this.createWrapper(),this.createTextarea(),this.createPre(),this.createCode(),this.runOptions(),this.listenTextarea(),this.populateDefault(),this.updateCode(this.code);},C.prototype.createWrapper=function(){this.code=this.editorRoot.innerHTML,this.editorRoot.innerHTML="",this.elWrapper=this.createElement("div",this.editorRoot),this.elWrapper.classList.add("codeflask");},C.prototype.createTextarea=function(){this.elTextarea=this.createElement("textarea",this.elWrapper),this.elTextarea.classList.add("codeflask__textarea","codeflask__flatten");},C.prototype.createPre=function(){this.elPre=this.createElement("pre",this.elWrapper),this.elPre.classList.add("codeflask__pre","codeflask__flatten");},C.prototype.createCode=function(){this.elCode=this.createElement("code",this.elPre),this.elCode.classList.add("codeflask__code","language-"+(this.opts.language||"html"));},C.prototype.createLineNumbers=function(){this.elLineNumbers=this.createElement("div",this.elWrapper),this.elLineNumbers.classList.add("codeflask__lines"),this.setLineNumber();},C.prototype.createElement=function(e,t){var n=document.createElement(e);return t.appendChild(n),n},C.prototype.runOptions=function(){this.opts.rtl=this.opts.rtl||!1,this.opts.tabSize=this.opts.tabSize||2,this.opts.enableAutocorrect=this.opts.enableAutocorrect||!1,this.opts.lineNumbers=this.opts.lineNumbers||!1,this.opts.defaultTheme=!1!==this.opts.defaultTheme,this.opts.areaId=this.opts.areaId||null,this.opts.ariaLabelledby=this.opts.ariaLabelledby||null,this.opts.readonly=this.opts.readonly||null,"boolean"!=typeof this.opts.handleTabs&&(this.opts.handleTabs=!0),"boolean"!=typeof this.opts.handleSelfClosingCharacters&&(this.opts.handleSelfClosingCharacters=!0),"boolean"!=typeof this.opts.handleNewLineIndentation&&(this.opts.handleNewLineIndentation=!0),!0===this.opts.rtl&&(this.elTextarea.setAttribute("dir","rtl"),this.elPre.setAttribute("dir","rtl")),!1===this.opts.enableAutocorrect&&(this.elTextarea.setAttribute("spellcheck","false"),this.elTextarea.setAttribute("autocapitalize","off"),this.elTextarea.setAttribute("autocomplete","off"),this.elTextarea.setAttribute("autocorrect","off")),this.opts.lineNumbers&&(this.elWrapper.classList.add("codeflask--has-line-numbers"),this.createLineNumbers()),this.opts.defaultTheme&&E("\n.codeflask {\n  background: #fff;\n  color: #4f559c;\n}\n\n.codeflask .token.punctuation {\n  color: #4a4a4a;\n}\n\n.codeflask .token.keyword {\n  color: #8500ff;\n}\n\n.codeflask .token.operator {\n  color: #ff5598;\n}\n\n.codeflask .token.string {\n  color: #41ad8f;\n}\n\n.codeflask .token.comment {\n  color: #9badb7;\n}\n\n.codeflask .token.function {\n  color: #8500ff;\n}\n\n.codeflask .token.boolean {\n  color: #8500ff;\n}\n\n.codeflask .token.number {\n  color: #8500ff;\n}\n\n.codeflask .token.selector {\n  color: #8500ff;\n}\n\n.codeflask .token.property {\n  color: #8500ff;\n}\n\n.codeflask .token.tag {\n  color: #8500ff;\n}\n\n.codeflask .token.attr-value {\n  color: #8500ff;\n}\n","theme-default",this.opts.styleParent),this.opts.areaId&&this.elTextarea.setAttribute("id",this.opts.areaId),this.opts.ariaLabelledby&&this.elTextarea.setAttribute("aria-labelledby",this.opts.ariaLabelledby),this.opts.readonly&&this.enableReadonlyMode();},C.prototype.updateLineNumbersCount=function(){for(var e="",t=1;t<=this.lineNumber;t++)e=e+'<span class="codeflask__lines__line">'+t+"</span>";this.elLineNumbers.innerHTML=e;},C.prototype.listenTextarea=function(){var e=this;this.elTextarea.addEventListener("input",(function(t){e.code=t.target.value,e.elCode.innerHTML=_(t.target.value),e.highlight(),setTimeout((function(){e.runUpdate(),e.setLineNumber();}),1);})),this.elTextarea.addEventListener("keydown",(function(t){e.handleTabs(t),e.handleSelfClosingCharacters(t),e.handleNewLineIndentation(t);})),this.elTextarea.addEventListener("scroll",(function(t){e.elPre.style.transform="translate3d(-"+t.target.scrollLeft+"px, -"+t.target.scrollTop+"px, 0)",e.elLineNumbers&&(e.elLineNumbers.style.transform="translate3d(0, -"+t.target.scrollTop+"px, 0)");}));},C.prototype.handleTabs=function(e){if(this.opts.handleTabs){if(9!==e.keyCode)return;e.preventDefault();var t=this.elTextarea,n=t.selectionDirection,a=t.selectionStart,i=t.selectionEnd,s=t.value,r=s.substr(0,a),o=s.substring(a,i),l=s.substring(i),d=" ".repeat(this.opts.tabSize);if(a!==i&&o.length>=d.length){var c=a-r.split("\n").pop().length,u=d.length,p=d.length;e.shiftKey?(s.substr(c,d.length)===d?(u=-u,c>a?(o=o.substring(0,c)+o.substring(c+d.length),p=0):c===a?(u=0,p=0,o=o.substring(d.length)):(p=-p,r=r.substring(0,c)+r.substring(c+d.length))):(u=0,p=0),o=o.replace(new RegExp("\n"+d.split("").join("\\"),"g"),"\n")):(r=r.substr(0,c)+d+r.substring(c,a),o=o.replace(/\n/g,"\n"+d)),t.value=r+o+l,t.selectionStart=a+u,t.selectionEnd=a+o.length+p,t.selectionDirection=n;}else t.value=r+d+l,t.selectionStart=a+d.length,t.selectionEnd=a+d.length;var g=t.value;this.updateCode(g),this.elTextarea.selectionEnd=i+this.opts.tabSize;}},C.prototype.handleSelfClosingCharacters=function(e){if(this.opts.handleSelfClosingCharacters){var t=e.key;if(["(","[","{","<","'",'"'].includes(t)||[")","]","}",">","'",'"'].includes(t))switch(t){case"(":case")":case"[":case"]":case"{":case"}":case"<":case">":case"'":case'"':this.closeCharacter(t);}}},C.prototype.setLineNumber=function(){this.lineNumber=this.code.split("\n").length,this.opts.lineNumbers&&this.updateLineNumbersCount();},C.prototype.handleNewLineIndentation=function(e){if(this.opts.handleNewLineIndentation&&13===e.keyCode){e.preventDefault();var t=this.elTextarea,n=t.selectionStart,a=t.selectionEnd,i=t.value,s=i.substr(0,n),r=i.substring(a),o=i.lastIndexOf("\n",n-1),l=o+i.slice(o+1).search(/[^ ]|$/),d=l>o?l-o:0,c=s+"\n"+" ".repeat(d)+r;t.value=c,t.selectionStart=n+d+1,t.selectionEnd=n+d+1,this.updateCode(t.value);}},C.prototype.closeCharacter=function(e){var t=this.elTextarea.selectionStart,n=this.elTextarea.selectionEnd;if(this.skipCloseChar(e)){var a=this.code.substr(n,1)===e,i=a?n+1:n,s=!a&&["'",'"'].includes(e)?e:"",r=""+this.code.substring(0,t)+s+this.code.substring(i);this.updateCode(r),this.elTextarea.selectionEnd=++this.elTextarea.selectionStart;}else {var o=e;switch(e){case"(":o=String.fromCharCode(e.charCodeAt()+1);break;case"<":case"{":case"[":o=String.fromCharCode(e.charCodeAt()+2);}var l=this.code.substring(t,n),d=""+this.code.substring(0,t)+l+o+this.code.substring(n);this.updateCode(d);}this.elTextarea.selectionEnd=t;},C.prototype.skipCloseChar=function(e){var t=this.elTextarea.selectionStart,n=this.elTextarea.selectionEnd,a=Math.abs(n-t)>0;return [")","}","]",">"].includes(e)||["'",'"'].includes(e)&&!a},C.prototype.updateCode=function(e){this.code=e,this.elTextarea.value=e,this.elCode.innerHTML=_(e),this.highlight(),this.setLineNumber(),setTimeout(this.runUpdate.bind(this),1);},C.prototype.updateLanguage=function(e){var t=this.opts.language;this.elCode.classList.remove("language-"+t),this.elCode.classList.add("language-"+e),this.opts.language=e,this.highlight();},C.prototype.addLanguage=function(e,t){F.languages[e]=t;},C.prototype.populateDefault=function(){this.updateCode(this.code);},C.prototype.highlight=function(){F.highlightElement(this.elCode,!1);},C.prototype.onUpdate=function(e){if(e&&"[object Function]"!=={}.toString.call(e))throw Error("CodeFlask expects callback of type Function");this.updateCallBack=e;},C.prototype.getCode=function(){return this.code},C.prototype.runUpdate=function(){this.updateCallBack&&this.updateCallBack(this.code);},C.prototype.enableReadonlyMode=function(){this.elTextarea.setAttribute("readonly",!0);},C.prototype.disableReadonlyMode=function(){this.elTextarea.removeAttribute("readonly");};const L=C;var O=n(668),N=n.n(O),P=n(733),I={};I.styleTagTransform=g(),I.setAttributes=d(),I.insert=o().bind(null,"head"),I.domAPI=s(),I.insertStyleElement=u(),t()(P.Z,I),P.Z&&P.Z.locals&&P.Z.locals;class ${static get DEFAULT_PLACEHOLDER(){return "// Hello"}static get enableLineBreaks(){return !0}constructor({data:e,config:t,api:n,readOnly:a}){this.api=n,this.readOnly=a,this._CSS={block:this.api.styles.block,wrapper:"ce-EditorJsCodeFlask",settingsButton:this.api.styles.settingsButton,settingsButtonActive:this.api.styles.settingsButtonActive},this.readOnly||(this.onKeyUp=this.onKeyUp.bind(this)),this._placeholder=t.placeholder?t.placeholder:$.DEFAULT_PLACEHOLDER,this._preserveBlank=void 0!==t.preserveBlank&&t.preserveBlank,this._element,this.data={},this.data.code=void 0===e.code?"// Hello World":e.code,this.data.language=void 0===e.language?"plain":e.language,this.data.showlinenumbers=void 0===e.showlinenumbers||e.showlinenumbers,this.data.editorInstance={};}onKeyUp(e){if("Backspace"!==e.code&&"Delete"!==e.code)return;const{textContent:t}=this._element;""===t&&(this._element.innerHTML="");}render(){this._element=document.createElement("div"),this._element.classList.add("editorjs-codeFlask_Wrapper");let e=document.createElement("div");e.classList.add("editorjs-codeFlask_Editor");let t=document.createElement("div");return t.classList.add("editorjs-codeFlask_LangDisplay"),t.innerHTML=this.data.language,this._element.appendChild(e),this._element.appendChild(t),this.data.editorInstance=new L(e,{language:this.data.language,lineNumbers:this.data.showlinenumbers,readonly:this.readOnly}),this.data.editorInstance.onUpdate((e=>{let t=e.split("\n").length;this._debounce(this._updateEditorHeight(t));})),this.data.editorInstance.addLanguage(this.data.language,k().languages[this.data.language]),this.data.editorInstance.updateCode(this.data.code),this._element}_updateEditorHeight(e){let t=21*e+10;t<60&&(t=60),this._element.style.height=t+"px";}_debounce(e,t=500){let n;return (...a)=>{clearTimeout(n),n=setTimeout((()=>{e.apply(this,a);}),t);}}renderSettings(){const e=document.createElement("div");let t=document.createElement("select");t.classList.add("small");for(var n=0;n<Object.keys(k().languages).length;n++)if("extend"!=Object.keys(k().languages)[n]&&"insertBefore"!=Object.keys(k().languages)[n]&&"DFS"!=Object.keys(k().languages)[n]){var a=document.createElement("option");a.value=Object.keys(k().languages)[n],a.text=Object.keys(k().languages)[n],Object.keys(k().languages)[n]==this.data.language&&(a.selected="selected"),t.appendChild(a);}return t.addEventListener("change",(e=>{this._updateLanguage(e.target.value);})),e.appendChild(t),new(N())(t,{searchable:!0,placeholder:"Language..."}),e}_toggleLineNumbers=e=>{this.data.showlinenumbers=!this.data.showlinenumbers;};_updateLanguage=e=>{this.data.language=e,this._element.querySelector(".editorjs-codeFlask_LangDisplay").innerHTML=this.data.language,this.data.editorInstance.updateLanguage(this.data.language);};save(e){return {code:this.data.editorInstance.getCode(),language:this.data.language,showlinenumbers:this.data.showlinenumbers}}static get isReadOnlySupported(){return !0}static get toolbox(){return {icon:y(),title:"CodeFlask"}}}})(),a.default})())); 
    } (editorjsCodeflask_bundle));

    var editorjsCodeflask_bundleExports = editorjsCodeflask_bundle.exports;
    var editorjsCodeflask = /*@__PURE__*/getDefaultExportFromCjs(editorjsCodeflask_bundleExports);

    var bundle$2 = {exports: {}};

    (function (module, exports) {
    	!function(t,e){module.exports=e();}(window,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r});},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(r,o,function(e){return t[e]}.bind(null,o));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/",n(n.s=5)}([function(t,e,n){var r=n(1);"string"==typeof r&&(r=[[t.i,r,""]]);var o={hmr:!0,transform:void 0,insertInto:void 0};n(3)(r,o);r.locals&&(t.exports=r.locals);},function(t,e,n){(t.exports=n(2)(!1)).push([t.i,".cdx-quote-icon svg {\n  transform: rotate(180deg);\n}\n\n.cdx-quote {\n  margin: 0;\n}\n\n.cdx-quote__text {\n  min-height: 158px;\n  margin-bottom: 10px;\n}\n\n.cdx-quote__caption {}\n\n.cdx-quote [contentEditable=true][data-placeholder]::before{\n  position: absolute;\n  content: attr(data-placeholder);\n  color: #707684;\n  font-weight: normal;\n  opacity: 0;\n}\n\n.cdx-quote [contentEditable=true][data-placeholder]:empty::before {\n  opacity: 1;\n}\n\n.cdx-quote [contentEditable=true][data-placeholder]:empty:focus::before {\n  opacity: 0;\n}\n\n\n.cdx-quote-settings {\n  display: flex;\n}\n\n.cdx-quote-settings .cdx-settings-button {\n  width: 50%;\n}\n",""]);},function(t,e){t.exports=function(t){var e=[];return e.toString=function(){return this.map(function(e){var n=function(t,e){var n=t[1]||"",r=t[3];if(!r)return n;if(e&&"function"==typeof btoa){var o=(a=r,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(a))))+" */"),i=r.sources.map(function(t){return "/*# sourceURL="+r.sourceRoot+t+" */"});return [n].concat(i).concat([o]).join("\n")}var a;return [n].join("\n")}(e,t);return e[2]?"@media "+e[2]+"{"+n+"}":n}).join("")},e.i=function(t,n){"string"==typeof t&&(t=[[null,t,""]]);for(var r={},o=0;o<this.length;o++){var i=this[o][0];"number"==typeof i&&(r[i]=!0);}for(o=0;o<t.length;o++){var a=t[o];"number"==typeof a[0]&&r[a[0]]||(n&&!a[2]?a[2]=n:n&&(a[2]="("+a[2]+") and ("+n+")"),e.push(a));}},e};},function(t,e,n){var r,o,i={},a=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),s=function(t){var e={};return function(t){if("function"==typeof t)return t();if(void 0===e[t]){var n=function(t){return document.querySelector(t)}.call(this,t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(t){n=null;}e[t]=n;}return e[t]}}(),c=null,u=0,l=[],f=n(4);function d(t,e){for(var n=0;n<t.length;n++){var r=t[n],o=i[r.id];if(o){o.refs++;for(var a=0;a<o.parts.length;a++)o.parts[a](r.parts[a]);for(;a<r.parts.length;a++)o.parts.push(b(r.parts[a],e));}else {var s=[];for(a=0;a<r.parts.length;a++)s.push(b(r.parts[a],e));i[r.id]={id:r.id,refs:1,parts:s};}}}function p(t,e){for(var n=[],r={},o=0;o<t.length;o++){var i=t[o],a=e.base?i[0]+e.base:i[0],s={css:i[1],media:i[2],sourceMap:i[3]};r[a]?r[a].parts.push(s):n.push(r[a]={id:a,parts:[s]});}return n}function h(t,e){var n=s(t.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=l[l.length-1];if("top"===t.insertAt)r?r.nextSibling?n.insertBefore(e,r.nextSibling):n.appendChild(e):n.insertBefore(e,n.firstChild),l.push(e);else if("bottom"===t.insertAt)n.appendChild(e);else {if("object"!=typeof t.insertAt||!t.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=s(t.insertInto+" "+t.insertAt.before);n.insertBefore(e,o);}}function v(t){if(null===t.parentNode)return !1;t.parentNode.removeChild(t);var e=l.indexOf(t);e>=0&&l.splice(e,1);}function y(t){var e=document.createElement("style");return void 0===t.attrs.type&&(t.attrs.type="text/css"),g(e,t.attrs),h(t,e),e}function g(t,e){Object.keys(e).forEach(function(n){t.setAttribute(n,e[n]);});}function b(t,e){var n,r,o,i;if(e.transform&&t.css){if(!(i=e.transform(t.css)))return function(){};t.css=i;}if(e.singleton){var a=u++;n=c||(c=y(e)),r=x.bind(null,n,a,!1),o=x.bind(null,n,a,!0);}else t.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(t){var e=document.createElement("link");return void 0===t.attrs.type&&(t.attrs.type="text/css"),t.attrs.rel="stylesheet",g(e,t.attrs),h(t,e),e}(e),r=function(t,e,n){var r=n.css,o=n.sourceMap,i=void 0===e.convertToAbsoluteUrls&&o;(e.convertToAbsoluteUrls||i)&&(r=f(r));o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var a=new Blob([r],{type:"text/css"}),s=t.href;t.href=URL.createObjectURL(a),s&&URL.revokeObjectURL(s);}.bind(null,n,e),o=function(){v(n),n.href&&URL.revokeObjectURL(n.href);}):(n=y(e),r=function(t,e){var n=e.css,r=e.media;r&&t.setAttribute("media",r);if(t.styleSheet)t.styleSheet.cssText=n;else {for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(n));}}.bind(null,n),o=function(){v(n);});return r(t),function(e){if(e){if(e.css===t.css&&e.media===t.media&&e.sourceMap===t.sourceMap)return;r(t=e);}else o();}}t.exports=function(t,e){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(e=e||{}).attrs="object"==typeof e.attrs?e.attrs:{},e.singleton||"boolean"==typeof e.singleton||(e.singleton=a()),e.insertInto||(e.insertInto="head"),e.insertAt||(e.insertAt="bottom");var n=p(t,e);return d(n,e),function(t){for(var r=[],o=0;o<n.length;o++){var a=n[o];(s=i[a.id]).refs--,r.push(s);}t&&d(p(t,e),e);for(o=0;o<r.length;o++){var s;if(0===(s=r[o]).refs){for(var c=0;c<s.parts.length;c++)s.parts[c]();delete i[s.id];}}}};var m,w=(m=[],function(t,e){return m[t]=e,m.filter(Boolean).join("\n")});function x(t,e,n,r){var o=n?"":r.css;if(t.styleSheet)t.styleSheet.cssText=w(e,o);else {var i=document.createTextNode(o),a=t.childNodes;a[e]&&t.removeChild(a[e]),a.length?t.insertBefore(i,a[e]):t.appendChild(i);}}},function(t,e){t.exports=function(t){var e="undefined"!=typeof window&&window.location;if(!e)throw new Error("fixUrls requires window.location");if(!t||"string"!=typeof t)return t;var n=e.protocol+"//"+e.host,r=n+e.pathname.replace(/\/[^\/]*$/,"/");return t.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,function(t,e){var o,i=e.trim().replace(/^"(.*)"$/,function(t,e){return e}).replace(/^'(.*)'$/,function(t,e){return e});return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(i)?t:(o=0===i.indexOf("//")?i:0===i.indexOf("/")?n+i:r+i.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")})};},function(t,e,n){n.r(e);n(0);function r(t){return function(t){if(Array.isArray(t)){for(var e=0,n=new Array(t.length);e<t.length;e++)n[e]=t[e];return n}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}function o(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r);}}function i(t,e,n){return e&&o(t.prototype,e),n&&o(t,n),t}n.d(e,"default",function(){return a});var a=function(){function t(e){var n=e.data,r=e.config,o=e.api,i=e.readOnly;!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t);var a=t.ALIGNMENTS,s=t.DEFAULT_ALIGNMENT;this.api=o,this.readOnly=i,this.quotePlaceholder=r.quotePlaceholder||t.DEFAULT_QUOTE_PLACEHOLDER,this.captionPlaceholder=r.captionPlaceholder||t.DEFAULT_CAPTION_PLACEHOLDER,this.data={text:n.text||"",caption:n.caption||"",alignment:Object.values(a).includes(n.alignment)&&n.alignment||r.defaultAlignment||s};}return i(t,[{key:"CSS",get:function(){return {baseClass:this.api.styles.block,wrapper:"cdx-quote",text:"cdx-quote__text",input:this.api.styles.input,caption:"cdx-quote__caption"}}},{key:"settings",get:function(){return [{name:"left",icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M17 7L5 7"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M17 17H5"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M13 12L5 12"/></svg>'},{name:"center",icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M18 7L6 7"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M18 17H6"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 12L8 12"/></svg>'}]}}],[{key:"isReadOnlySupported",get:function(){return !0}},{key:"toolbox",get:function(){return {icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 10.8182L9 10.8182C8.80222 10.8182 8.60888 10.7649 8.44443 10.665C8.27998 10.5651 8.15181 10.4231 8.07612 10.257C8.00043 10.0909 7.98063 9.90808 8.01922 9.73174C8.0578 9.55539 8.15304 9.39341 8.29289 9.26627C8.43275 9.13913 8.61093 9.05255 8.80491 9.01747C8.99889 8.98239 9.19996 9.00039 9.38268 9.0692C9.56541 9.13801 9.72159 9.25453 9.83147 9.40403C9.94135 9.55353 10 9.72929 10 9.90909L10 12.1818C10 12.664 9.78929 13.1265 9.41421 13.4675C9.03914 13.8084 8.53043 14 8 14"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 10.8182L15 10.8182C14.8022 10.8182 14.6089 10.7649 14.4444 10.665C14.28 10.5651 14.1518 10.4231 14.0761 10.257C14.0004 10.0909 13.9806 9.90808 14.0192 9.73174C14.0578 9.55539 14.153 9.39341 14.2929 9.26627C14.4327 9.13913 14.6109 9.05255 14.8049 9.01747C14.9989 8.98239 15.2 9.00039 15.3827 9.0692C15.5654 9.13801 15.7216 9.25453 15.8315 9.40403C15.9414 9.55353 16 9.72929 16 9.90909L16 12.1818C16 12.664 15.7893 13.1265 15.4142 13.4675C15.0391 13.8084 14.5304 14 14 14"/></svg>',title:"Quote"}}},{key:"contentless",get:function(){return !0}},{key:"enableLineBreaks",get:function(){return !0}},{key:"DEFAULT_QUOTE_PLACEHOLDER",get:function(){return "Enter a quote"}},{key:"DEFAULT_CAPTION_PLACEHOLDER",get:function(){return "Enter a caption"}},{key:"ALIGNMENTS",get:function(){return {left:"left",center:"center"}}},{key:"DEFAULT_ALIGNMENT",get:function(){return t.ALIGNMENTS.left}},{key:"conversionConfig",get:function(){return {import:"text",export:function(t){return t.caption?"".concat(t.text," — ").concat(t.caption):t.text}}}}]),i(t,[{key:"render",value:function(){var t=this._make("blockquote",[this.CSS.baseClass,this.CSS.wrapper]),e=this._make("div",[this.CSS.input,this.CSS.text],{contentEditable:!this.readOnly,innerHTML:this.data.text}),n=this._make("div",[this.CSS.input,this.CSS.caption],{contentEditable:!this.readOnly,innerHTML:this.data.caption});return e.dataset.placeholder=this.quotePlaceholder,n.dataset.placeholder=this.captionPlaceholder,t.appendChild(e),t.appendChild(n),t}},{key:"save",value:function(t){var e=t.querySelector(".".concat(this.CSS.text)),n=t.querySelector(".".concat(this.CSS.caption));return Object.assign(this.data,{text:e.innerHTML,caption:n.innerHTML})}},{key:"renderSettings",value:function(){var t=this;return this.settings.map(function(e){return {icon:e.icon,label:t.api.i18n.t("Align ".concat((n=e.name,n[0].toUpperCase()+n.substr(1)))),onActivate:function(){return t._toggleTune(e.name)},isActive:t.data.alignment===e.name,closeOnActivate:!0};var n;})}},{key:"_toggleTune",value:function(t){this.data.alignment=t;}},{key:"_make",value:function(t){var e,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},i=document.createElement(t);Array.isArray(n)?(e=i.classList).add.apply(e,r(n)):n&&i.classList.add(n);for(var a in o)i[a]=o[a];return i}}],[{key:"sanitize",get:function(){return {text:{br:!0},caption:{br:!0},alignment:{}}}}]),t}();}]).default}); 
    } (bundle$2));

    var bundleExports$2 = bundle$2.exports;
    var Quote = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$2);

    var bundle$1 = {exports: {}};

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,(function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(r,i,function(t){return e[t]}.bind(null,i));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=4)}([function(e,t,n){var r=n(1),i=n(2);"string"==typeof(i=i.__esModule?i.default:i)&&(i=[[e.i,i,""]]);var o={insert:"head",singleton:!1};r(i,o);e.exports=i.locals||{};},function(e,t,n){var r,i=function(){return void 0===r&&(r=Boolean(window&&document&&document.all&&!window.atob)),r},o=function(){var e={};return function(t){if(void 0===e[t]){var n=document.querySelector(t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(e){n=null;}e[t]=n;}return e[t]}}(),a=[];function s(e){for(var t=-1,n=0;n<a.length;n++)if(a[n].identifier===e){t=n;break}return t}function c(e,t){for(var n={},r=[],i=0;i<e.length;i++){var o=e[i],c=t.base?o[0]+t.base:o[0],l=n[c]||0,u="".concat(c," ").concat(l);n[c]=l+1;var d=s(u),f={css:o[1],media:o[2],sourceMap:o[3]};-1!==d?(a[d].references++,a[d].updater(f)):a.push({identifier:u,updater:y(f,t),references:1}),r.push(u);}return r}function l(e){var t=document.createElement("style"),r=e.attributes||{};if(void 0===r.nonce){var i=n.nc;i&&(r.nonce=i);}if(Object.keys(r).forEach((function(e){t.setAttribute(e,r[e]);})),"function"==typeof e.insert)e.insert(t);else {var a=o(e.insert||"head");if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(t);}return t}var u,d=(u=[],function(e,t){return u[e]=t,u.filter(Boolean).join("\n")});function f(e,t,n,r){var i=n?"":r.media?"@media ".concat(r.media," {").concat(r.css,"}"):r.css;if(e.styleSheet)e.styleSheet.cssText=d(t,i);else {var o=document.createTextNode(i),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(o,a[t]):e.appendChild(o);}}function p(e,t,n){var r=n.css,i=n.media,o=n.sourceMap;if(i?e.setAttribute("media",i):e.removeAttribute("media"),o&&btoa&&(r+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(o))))," */")),e.styleSheet)e.styleSheet.cssText=r;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(r));}}var h=null,m=0;function y(e,t){var n,r,i;if(t.singleton){var o=m++;n=h||(h=l(t)),r=f.bind(null,n,o,!1),i=f.bind(null,n,o,!0);}else n=l(t),r=p.bind(null,n,t),i=function(){!function(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);}(n);};return r(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;r(e=t);}else i();}}e.exports=function(e,t){(t=t||{}).singleton||"boolean"==typeof t.singleton||(t.singleton=i());var n=c(e=e||[],t);return function(e){if(e=e||[],"[object Array]"===Object.prototype.toString.call(e)){for(var r=0;r<n.length;r++){var i=s(n[r]);a[i].references--;}for(var o=c(e,t),l=0;l<n.length;l++){var u=s(n[l]);0===a[u].references&&(a[u].updater(),a.splice(u,1));}n=o;}}};},function(e,t,n){(t=n(3)(!1)).push([e.i,".cdx-list {\n    margin: 0;\n    padding-left: 40px;\n    outline: none;\n}\n\n    .cdx-list__item {\n        padding: 5.5px 0 5.5px 3px;\n        line-height: 1.6em;\n    }\n\n    .cdx-list--unordered {\n        list-style: disc;\n    }\n\n    .cdx-list--ordered {\n        list-style: decimal;\n    }\n\n    .cdx-list-settings {\n        display: flex;\n    }\n\n    .cdx-list-settings .cdx-settings-button {\n            width: 50%;\n        }\n",""]),e.exports=t;},function(e,t,n){e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=function(e,t){var n=e[1]||"",r=e[3];if(!r)return n;if(t&&"function"==typeof btoa){var i=(a=r,s=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),c="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(s),"/*# ".concat(c," */")),o=r.sources.map((function(e){return "/*# sourceURL=".concat(r.sourceRoot||"").concat(e," */")}));return [n].concat(o).concat([i]).join("\n")}var a,s,c;return [n].join("\n")}(t,e);return t[2]?"@media ".concat(t[2]," {").concat(n,"}"):n})).join("")},t.i=function(e,n,r){"string"==typeof e&&(e=[[null,e,""]]);var i={};if(r)for(var o=0;o<this.length;o++){var a=this[o][0];null!=a&&(i[a]=!0);}for(var s=0;s<e.length;s++){var c=[].concat(e[s]);r&&i[c[0]]||(n&&(c[2]?c[2]="".concat(n," and ").concat(c[2]):c[2]=n),t.push(c));}},t};},function(e,t,n){n.r(t),n.d(t,"default",(function(){return d}));n(0);const r='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><line x1="9" x2="19" y1="7" y2="7" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><line x1="9" x2="19" y1="12" y2="12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><line x1="9" x2="19" y1="17" y2="17" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.00001 17H4.99002"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.00001 12H4.99002"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.00001 7H4.99002"/></svg>';function i(e){return function(e){if(Array.isArray(e))return o(e)}(e)||function(e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e))return Array.from(e)}(e)||function(e,t){if(!e)return;if("string"==typeof e)return o(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);"Object"===n&&e.constructor&&(n=e.constructor.name);if("Map"===n||"Set"===n)return Array.from(e);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return o(e,t)}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function o(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r);}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){c(e,t,n[t]);})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t));}));}return e}function c(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}function u(e,t,n){return t&&l(e.prototype,t),n&&l(e,n),e}var d=function(){function e(t){var n=t.data,i=t.config,o=t.api,a=t.readOnly;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this._elements={wrapper:null},this.api=o,this.readOnly=a,this.settings=[{name:"unordered",label:this.api.i18n.t("Unordered"),icon:r,default:"unordered"===i.defaultStyle||!1},{name:"ordered",label:this.api.i18n.t("Ordered"),icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><line x1="12" x2="19" y1="7" y2="7" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><line x1="12" x2="19" y1="12" y2="12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><line x1="12" x2="19" y1="17" y2="17" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M7.79999 14L7.79999 7.2135C7.79999 7.12872 7.7011 7.0824 7.63597 7.13668L4.79999 9.5"/></svg>',default:"ordered"===i.defaultStyle||!0}],this._data={style:this.settings.find((function(e){return !0===e.default})).name,items:[]},this.data=n;}return u(e,null,[{key:"isReadOnlySupported",get:function(){return !0}},{key:"enableLineBreaks",get:function(){return !0}},{key:"toolbox",get:function(){return {icon:r,title:"List"}}}]),u(e,[{key:"render",value:function(){var e=this;return this._elements.wrapper=this.makeMainTag(this._data.style),this._data.items.length?this._data.items.forEach((function(t){e._elements.wrapper.appendChild(e._make("li",e.CSS.item,{innerHTML:t}));})):this._elements.wrapper.appendChild(this._make("li",this.CSS.item)),this.readOnly||this._elements.wrapper.addEventListener("keydown",(function(t){switch(t.keyCode){case 13:e.getOutofList(t);break;case 8:e.backspace(t);}}),!1),this._elements.wrapper}},{key:"save",value:function(){return this.data}},{key:"renderSettings",value:function(){var e=this;return this.settings.map((function(t){return s(s({},t),{},{isActive:e._data.style===t.name,closeOnActivate:!0,onActivate:function(){return e.toggleTune(t.name)}})}))}},{key:"onPaste",value:function(e){var t=e.detail.data;this.data=this.pasteHandler(t);}},{key:"makeMainTag",value:function(e){var t="ordered"===e?this.CSS.wrapperOrdered:this.CSS.wrapperUnordered,n="ordered"===e?"ol":"ul";return this._make(n,[this.CSS.baseBlock,this.CSS.wrapper,t],{contentEditable:!this.readOnly})}},{key:"toggleTune",value:function(e){for(var t=this.makeMainTag(e);this._elements.wrapper.hasChildNodes();)t.appendChild(this._elements.wrapper.firstChild);this._elements.wrapper.replaceWith(t),this._elements.wrapper=t,this._data.style=e;}},{key:"_make",value:function(e){var t,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},o=document.createElement(e);Array.isArray(n)?(t=o.classList).add.apply(t,i(n)):n&&o.classList.add(n);for(var a in r)o[a]=r[a];return o}},{key:"getOutofList",value:function(e){var t=this._elements.wrapper.querySelectorAll("."+this.CSS.item);if(!(t.length<2)){var n=t[t.length-1],r=this.currentItem;r!==n||n.textContent.trim().length||(r.parentElement.removeChild(r),this.api.blocks.insert(),this.api.caret.setToBlock(this.api.blocks.getCurrentBlockIndex()),e.preventDefault(),e.stopPropagation());}}},{key:"backspace",value:function(e){var t=this._elements.wrapper.querySelectorAll("."+this.CSS.item),n=t[0];n&&t.length<2&&!n.innerHTML.replace("<br>"," ").trim()&&e.preventDefault();}},{key:"selectItem",value:function(e){e.preventDefault();var t=window.getSelection(),n=t.anchorNode.parentNode.closest("."+this.CSS.item),r=new Range;r.selectNodeContents(n),t.removeAllRanges(),t.addRange(r);}},{key:"pasteHandler",value:function(e){var t,n=e.tagName;switch(n){case"OL":t="ordered";break;case"UL":case"LI":t="unordered";}var r={style:t,items:[]};if("LI"===n)r.items=[e.innerHTML];else {var i=Array.from(e.querySelectorAll("LI"));r.items=i.map((function(e){return e.innerHTML})).filter((function(e){return !!e.trim()}));}return r}},{key:"CSS",get:function(){return {baseBlock:this.api.styles.block,wrapper:"cdx-list",wrapperOrdered:"cdx-list--ordered",wrapperUnordered:"cdx-list--unordered",item:"cdx-list__item"}}},{key:"data",set:function(e){e||(e={}),this._data.style=e.style||this.settings.find((function(e){return !0===e.default})).name,this._data.items=e.items||[];var t=this._elements.wrapper;t&&t.parentNode.replaceChild(this.render(),t);},get:function(){this._data.items=[];for(var e=this._elements.wrapper.querySelectorAll(".".concat(this.CSS.item)),t=0;t<e.length;t++){e[t].innerHTML.replace("<br>"," ").trim()&&this._data.items.push(e[t].innerHTML);}return this._data}},{key:"currentItem",get:function(){var e=window.getSelection().anchorNode;return e.nodeType!==Node.ELEMENT_NODE&&(e=e.parentNode),e.closest(".".concat(this.CSS.item))}}],[{key:"conversionConfig",get:function(){return {export:function(e){return e.items.join(". ")},import:function(e){return {items:[e],style:"unordered"}}}}},{key:"sanitize",get:function(){return {style:{},items:{br:!0}}}},{key:"pasteConfig",get:function(){return {tags:["OL","UL","LI"]}}}]),e}();}]).default})); 
    } (bundle$1));

    var bundleExports$1 = bundle$1.exports;
    var List = /*@__PURE__*/getDefaultExportFromCjs(bundleExports$1);

    var bundle = {exports: {}};

    (function (module, exports) {
    	!function(e,t){module.exports=t();}(window,(function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=5)}([function(e,t,n){var r=n(1);"string"==typeof r&&(r=[[e.i,r,""]]);var o={hmr:!0,transform:void 0,insertInto:void 0};n(3)(r,o);r.locals&&(e.exports=r.locals);},function(e,t,n){(e.exports=n(2)(!1)).push([e.i,"/**\n * Plugin styles\n */\n.ce-header {\n  padding: 0.6em 0 3px;\n  margin: 0;\n  line-height: 1.25em;\n  outline: none;\n}\n\n.ce-header p,\n.ce-header div{\n  padding: 0 !important;\n  margin: 0 !important;\n}\n\n/**\n * Styles for Plugin icon in Toolbar\n */\n.ce-header__icon {}\n\n.ce-header[contentEditable=true][data-placeholder]::before{\n  position: absolute;\n  content: attr(data-placeholder);\n  color: #707684;\n  font-weight: normal;\n  display: none;\n  cursor: text;\n}\n\n.ce-header[contentEditable=true][data-placeholder]:empty::before {\n  display: block;\n}\n\n.ce-header[contentEditable=true][data-placeholder]:empty:focus::before {\n  display: none;\n}\n",""]);},function(e,t){e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=function(e,t){var n=e[1]||"",r=e[3];if(!r)return n;if(t&&"function"==typeof btoa){var o=(a=r,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(a))))+" */"),i=r.sources.map((function(e){return "/*# sourceURL="+r.sourceRoot+e+" */"}));return [n].concat(i).concat([o]).join("\n")}var a;return [n].join("\n")}(t,e);return t[2]?"@media "+t[2]+"{"+n+"}":n})).join("")},t.i=function(e,n){"string"==typeof e&&(e=[[null,e,""]]);for(var r={},o=0;o<this.length;o++){var i=this[o][0];"number"==typeof i&&(r[i]=!0);}for(o=0;o<e.length;o++){var a=e[o];"number"==typeof a[0]&&r[a[0]]||(n&&!a[2]?a[2]=n:n&&(a[2]="("+a[2]+") and ("+n+")"),t.push(a));}},t};},function(e,t,n){var r,o,i={},a=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),s=function(e){return document.querySelector(e)},l=function(e){var t={};return function(e){if("function"==typeof e)return e();if(void 0===t[e]){var n=s.call(this,e);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head;}catch(e){n=null;}t[e]=n;}return t[e]}}(),u=null,c=0,f=[],d=n(4);function p(e,t){for(var n=0;n<e.length;n++){var r=e[n],o=i[r.id];if(o){o.refs++;for(var a=0;a<o.parts.length;a++)o.parts[a](r.parts[a]);for(;a<r.parts.length;a++)o.parts.push(y(r.parts[a],t));}else {var s=[];for(a=0;a<r.parts.length;a++)s.push(y(r.parts[a],t));i[r.id]={id:r.id,refs:1,parts:s};}}}function h(e,t){for(var n=[],r={},o=0;o<e.length;o++){var i=e[o],a=t.base?i[0]+t.base:i[0],s={css:i[1],media:i[2],sourceMap:i[3]};r[a]?r[a].parts.push(s):n.push(r[a]={id:a,parts:[s]});}return n}function v(e,t){var n=l(e.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=f[f.length-1];if("top"===e.insertAt)r?r.nextSibling?n.insertBefore(t,r.nextSibling):n.appendChild(t):n.insertBefore(t,n.firstChild),f.push(t);else if("bottom"===e.insertAt)n.appendChild(t);else {if("object"!=typeof e.insertAt||!e.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=l(e.insertInto+" "+e.insertAt.before);n.insertBefore(t,o);}}function g(e){if(null===e.parentNode)return !1;e.parentNode.removeChild(e);var t=f.indexOf(e);t>=0&&f.splice(t,1);}function b(e){var t=document.createElement("style");return void 0===e.attrs.type&&(e.attrs.type="text/css"),m(t,e.attrs),v(e,t),t}function m(e,t){Object.keys(t).forEach((function(n){e.setAttribute(n,t[n]);}));}function y(e,t){var n,r,o,i;if(t.transform&&e.css){if(!(i=t.transform(e.css)))return function(){};e.css=i;}if(t.singleton){var a=c++;n=u||(u=b(t)),r=L.bind(null,n,a,!1),o=L.bind(null,n,a,!0);}else e.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(e){var t=document.createElement("link");return void 0===e.attrs.type&&(e.attrs.type="text/css"),e.attrs.rel="stylesheet",m(t,e.attrs),v(e,t),t}(t),r=x.bind(null,n,t),o=function(){g(n),n.href&&URL.revokeObjectURL(n.href);}):(n=b(t),r=M.bind(null,n),o=function(){g(n);});return r(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;r(e=t);}else o();}}e.exports=function(e,t){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(t=t||{}).attrs="object"==typeof t.attrs?t.attrs:{},t.singleton||"boolean"==typeof t.singleton||(t.singleton=a()),t.insertInto||(t.insertInto="head"),t.insertAt||(t.insertAt="bottom");var n=h(e,t);return p(n,t),function(e){for(var r=[],o=0;o<n.length;o++){var a=n[o];(s=i[a.id]).refs--,r.push(s);}e&&p(h(e,t),t);for(o=0;o<r.length;o++){var s;if(0===(s=r[o]).refs){for(var l=0;l<s.parts.length;l++)s.parts[l]();delete i[s.id];}}}};var w,k=(w=[],function(e,t){return w[e]=t,w.filter(Boolean).join("\n")});function L(e,t,n,r){var o=n?"":r.css;if(e.styleSheet)e.styleSheet.cssText=k(t,o);else {var i=document.createTextNode(o),a=e.childNodes;a[t]&&e.removeChild(a[t]),a.length?e.insertBefore(i,a[t]):e.appendChild(i);}}function M(e,t){var n=t.css,r=t.media;if(r&&e.setAttribute("media",r),e.styleSheet)e.styleSheet.cssText=n;else {for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(n));}}function x(e,t,n){var r=n.css,o=n.sourceMap,i=void 0===t.convertToAbsoluteUrls&&o;(t.convertToAbsoluteUrls||i)&&(r=d(r)),o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var a=new Blob([r],{type:"text/css"}),s=e.href;e.href=URL.createObjectURL(a),s&&URL.revokeObjectURL(s);}},function(e,t){e.exports=function(e){var t="undefined"!=typeof window&&window.location;if(!t)throw new Error("fixUrls requires window.location");if(!e||"string"!=typeof e)return e;var n=t.protocol+"//"+t.host,r=n+t.pathname.replace(/\/[^\/]*$/,"/");return e.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,(function(e,t){var o,i=t.trim().replace(/^"(.*)"$/,(function(e,t){return t})).replace(/^'(.*)'$/,(function(e,t){return t}));return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(i)?e:(o=0===i.indexOf("//")?i:0===i.indexOf("/")?n+i:r+i.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")}))};},function(e,t,n){n.r(t),n.d(t,"default",(function(){return i}));n(0);function r(e){return (r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}
    	/**
    	 * Header block for the Editor.js.
    	 *
    	 * @author CodeX (team@ifmo.su)
    	 * @copyright CodeX 2018
    	 * @license MIT
    	 * @version 2.0.0
    	 */
    	var i=function(){function e(t){var n=t.data,r=t.config,o=t.api,i=t.readOnly;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.api=o,this.readOnly=i,this._CSS={block:this.api.styles.block,wrapper:"ce-header"},this._settings=r,this._data=this.normalizeData(n),this._element=this.getTag();}var t,n,i;return t=e,i=[{key:"conversionConfig",get:function(){return {export:"text",import:"text"}}},{key:"sanitize",get:function(){return {level:!1,text:{}}}},{key:"isReadOnlySupported",get:function(){return !0}},{key:"pasteConfig",get:function(){return {tags:["H1","H2","H3","H4","H5","H6"]}}},{key:"toolbox",get:function(){return {icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9 7L9 12M9 17V12M9 12L15 12M15 7V12M15 17L15 12"/></svg>',title:"Heading"}}}],(n=[{key:"normalizeData",value:function(e){var t={};return "object"!==r(e)&&(e={}),t.text=e.text||"",t.level=parseInt(e.level)||this.defaultLevel.number,t}},{key:"render",value:function(){return this._element}},{key:"renderSettings",value:function(){var e=this;return this.levels.map((function(t){return {icon:t.svg,label:e.api.i18n.t("Heading ".concat(t.number)),onActivate:function(){return e.setLevel(t.number)},closeOnActivate:!0,isActive:e.currentLevel.number===t.number}}))}},{key:"setLevel",value:function(e){this.data={level:e,text:this.data.text};}},{key:"merge",value:function(e){var t={text:this.data.text+e.text,level:this.data.level};this.data=t;}},{key:"validate",value:function(e){return ""!==e.text.trim()}},{key:"save",value:function(e){return {text:e.innerHTML,level:this.currentLevel.number}}},{key:"getTag",value:function(){var e=document.createElement(this.currentLevel.tag);return e.innerHTML=this._data.text||"",e.classList.add(this._CSS.wrapper),e.contentEditable=this.readOnly?"false":"true",e.dataset.placeholder=this.api.i18n.t(this._settings.placeholder||""),e}},{key:"onPaste",value:function(e){var t=e.detail.data,n=this.defaultLevel.number;switch(t.tagName){case"H1":n=1;break;case"H2":n=2;break;case"H3":n=3;break;case"H4":n=4;break;case"H5":n=5;break;case"H6":n=6;}this._settings.levels&&(n=this._settings.levels.reduce((function(e,t){return Math.abs(t-n)<Math.abs(e-n)?t:e}))),this.data={level:n,text:t.innerHTML};}},{key:"data",get:function(){return this._data.text=this._element.innerHTML,this._data.level=this.currentLevel.number,this._data},set:function(e){if(this._data=this.normalizeData(e),void 0!==e.level&&this._element.parentNode){var t=this.getTag();t.innerHTML=this._element.innerHTML,this._element.parentNode.replaceChild(t,this._element),this._element=t;}void 0!==e.text&&(this._element.innerHTML=this._data.text||"");}},{key:"currentLevel",get:function(){var e=this,t=this.levels.find((function(t){return t.number===e._data.level}));return t||(t=this.defaultLevel),t}},{key:"defaultLevel",get:function(){var e=this;if(this._settings.defaultLevel){var t=this.levels.find((function(t){return t.number===e._settings.defaultLevel}));if(t)return t;console.warn("(ง'̀-'́)ง Heading Tool: the default level specified was not found in available levels");}return this.levels[1]}},{key:"levels",get:function(){var e=this,t=[{number:1,tag:"H1",svg:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 7L6 12M6 17L6 12M6 12L12 12M12 7V12M12 17L12 12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M19 17V10.2135C19 10.1287 18.9011 10.0824 18.836 10.1367L16 12.5"/></svg>'},{number:2,tag:"H2",svg:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 7L6 12M6 17L6 12M6 12L12 12M12 7V12M12 17L12 12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 11C16 10 19 9.5 19 12C19 13.9771 16.0684 13.9997 16.0012 16.8981C15.9999 16.9533 16.0448 17 16.1 17L19.3 17"/></svg>'},{number:3,tag:"H3",svg:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 7L6 12M6 17L6 12M6 12L12 12M12 7V12M12 17L12 12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 11C16 10.5 16.8323 10 17.6 10C18.3677 10 19.5 10.311 19.5 11.5C19.5 12.5315 18.7474 12.9022 18.548 12.9823C18.5378 12.9864 18.5395 13.0047 18.5503 13.0063C18.8115 13.0456 20 13.3065 20 14.8C20 16 19.5 17 17.8 17C17.8 17 16 17 16 16.3"/></svg>'},{number:4,tag:"H4",svg:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 7L6 12M6 17L6 12M6 12L12 12M12 7V12M12 17L12 12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M18 10L15.2834 14.8511C15.246 14.9178 15.294 15 15.3704 15C16.8489 15 18.7561 15 20.2 15M19 17C19 15.7187 19 14.8813 19 13.6"/></svg>'},{number:5,tag:"H5",svg:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 7L6 12M6 17L6 12M6 12L12 12M12 7V12M12 17L12 12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16 15.9C16 15.9 16.3768 17 17.8 17C19.5 17 20 15.6199 20 14.7C20 12.7323 17.6745 12.0486 16.1635 12.9894C16.094 13.0327 16 12.9846 16 12.9027V10.1C16 10.0448 16.0448 10 16.1 10H19.8"/></svg>'},{number:6,tag:"H6",svg:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 7L6 12M6 17L6 12M6 12L12 12M12 7V12M12 17L12 12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M19.5 10C16.5 10.5 16 13.3285 16 15M16 15V15C16 16.1046 16.8954 17 18 17H18.3246C19.3251 17 20.3191 16.3492 20.2522 15.3509C20.0612 12.4958 16 12.6611 16 15Z"/></svg>'}];return this._settings.levels?t.filter((function(t){return e._settings.levels.includes(t.number)})):t}}])&&o(t.prototype,n),i&&o(t,i),e}();}]).default})); 
    } (bundle));

    var bundleExports = bundle.exports;
    var Header = /*@__PURE__*/getDefaultExportFromCjs(bundleExports);

    var Ot = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
    function xe(s) {
      return s && s.__esModule && Object.prototype.hasOwnProperty.call(s, "default") ? s.default : s;
    }
    function Be() {
    }
    Object.assign(Be, {
      default: Be,
      register: Be,
      revert: function() {
      },
      __esModule: !0
    });
    Element.prototype.matches || (Element.prototype.matches = Element.prototype.matchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || Element.prototype.webkitMatchesSelector || function(s) {
      const e = (this.document || this.ownerDocument).querySelectorAll(s);
      let t = e.length;
      for (; --t >= 0 && e.item(t) !== this; )
        ;
      return t > -1;
    });
    Element.prototype.closest || (Element.prototype.closest = function(s) {
      let e = this;
      if (!document.documentElement.contains(e))
        return null;
      do {
        if (e.matches(s))
          return e;
        e = e.parentElement || e.parentNode;
      } while (e !== null);
      return null;
    });
    Element.prototype.prepend || (Element.prototype.prepend = function(e) {
      const t = document.createDocumentFragment();
      Array.isArray(e) || (e = [e]), e.forEach((o) => {
        const i = o instanceof Node;
        t.appendChild(i ? o : document.createTextNode(o));
      }), this.insertBefore(t, this.firstChild);
    });
    Element.prototype.scrollIntoViewIfNeeded || (Element.prototype.scrollIntoViewIfNeeded = function(s) {
      s = arguments.length === 0 ? !0 : !!s;
      const e = this.parentNode, t = window.getComputedStyle(e, null), o = parseInt(t.getPropertyValue("border-top-width")), i = parseInt(t.getPropertyValue("border-left-width")), n = this.offsetTop - e.offsetTop < e.scrollTop, r = this.offsetTop - e.offsetTop + this.clientHeight - o > e.scrollTop + e.clientHeight, a = this.offsetLeft - e.offsetLeft < e.scrollLeft, l = this.offsetLeft - e.offsetLeft + this.clientWidth - i > e.scrollLeft + e.clientWidth, c = n && !r;
      (n || r) && s && (e.scrollTop = this.offsetTop - e.offsetTop - e.clientHeight / 2 - o + this.clientHeight / 2), (a || l) && s && (e.scrollLeft = this.offsetLeft - e.offsetLeft - e.clientWidth / 2 - i + this.clientWidth / 2), (n || r || a || l) && !s && this.scrollIntoView(c);
    });
    window.requestIdleCallback = window.requestIdleCallback || function(s) {
      const e = Date.now();
      return setTimeout(function() {
        s({
          didTimeout: !1,
          timeRemaining: function() {
            return Math.max(0, 50 - (Date.now() - e));
          }
        });
      }, 1);
    };
    window.cancelIdleCallback = window.cancelIdleCallback || function(s) {
      clearTimeout(s);
    };
    let At = (s = 21) => crypto.getRandomValues(new Uint8Array(s)).reduce((e, t) => (t &= 63, t < 36 ? e += t.toString(36) : t < 62 ? e += (t - 26).toString(36).toUpperCase() : t > 62 ? e += "-" : e += "_", e), "");
    var it = /* @__PURE__ */ ((s) => (s.VERBOSE = "VERBOSE", s.INFO = "INFO", s.WARN = "WARN", s.ERROR = "ERROR", s))(it || {});
    const B = {
      BACKSPACE: 8,
      TAB: 9,
      ENTER: 13,
      SHIFT: 16,
      CTRL: 17,
      ALT: 18,
      ESC: 27,
      SPACE: 32,
      LEFT: 37,
      UP: 38,
      DOWN: 40,
      RIGHT: 39,
      DELETE: 46,
      META: 91
    }, _t = {
      LEFT: 0,
      WHEEL: 1,
      RIGHT: 2,
      BACKWARD: 3,
      FORWARD: 4
    };
    function be(s, e, t = "log", o, i = "color: inherit") {
      if (!("console" in window) || !window.console[t])
        return;
      const n = ["info", "log", "warn", "error"].includes(t), r = [];
      switch (be.logLevel) {
        case "ERROR":
          if (t !== "error")
            return;
          break;
        case "WARN":
          if (!["error", "warn"].includes(t))
            return;
          break;
        case "INFO":
          if (!n || s)
            return;
          break;
      }
      o && r.push(o);
      const a = "Editor.js 2.28.2", l = `line-height: 1em;
            color: #006FEA;
            display: inline-block;
            font-size: 11px;
            line-height: 1em;
            background-color: #fff;
            padding: 4px 9px;
            border-radius: 30px;
            border: 1px solid rgba(56, 138, 229, 0.16);
            margin: 4px 5px 4px 0;`;
      s && (n ? (r.unshift(l, i), e = `%c${a}%c ${e}`) : e = `( ${a} )${e}`);
      try {
        n ? o ? console[t](`${e} %o`, ...r) : console[t](e, ...r) : console[t](e);
      } catch {
      }
    }
    be.logLevel = "VERBOSE";
    function Nt(s) {
      be.logLevel = s;
    }
    const L = be.bind(window, !1), K = be.bind(window, !0);
    function oe(s) {
      return Object.prototype.toString.call(s).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    }
    function D(s) {
      return oe(s) === "function" || oe(s) === "asyncfunction";
    }
    function z(s) {
      return oe(s) === "object";
    }
    function J(s) {
      return oe(s) === "string";
    }
    function Rt(s) {
      return oe(s) === "boolean";
    }
    function qe(s) {
      return oe(s) === "number";
    }
    function Ze(s) {
      return oe(s) === "undefined";
    }
    function V(s) {
      return s ? Object.keys(s).length === 0 && s.constructor === Object : !0;
    }
    function nt(s) {
      return s > 47 && s < 58 || // number keys
      s === 32 || s === 13 || // Space bar & return key(s)
      s === 229 || // processing key input for certain languages — Chinese, Japanese, etc.
      s > 64 && s < 91 || // letter keys
      s > 95 && s < 112 || // Numpad keys
      s > 185 && s < 193 || // ;=,-./` (in order)
      s > 218 && s < 223;
    }
    async function Dt(s, e = () => {
    }, t = () => {
    }) {
      async function o(i, n, r) {
        try {
          await i.function(i.data), await n(Ze(i.data) ? {} : i.data);
        } catch {
          r(Ze(i.data) ? {} : i.data);
        }
      }
      return s.reduce(async (i, n) => (await i, o(n, e, t)), Promise.resolve());
    }
    function st(s) {
      return Array.prototype.slice.call(s);
    }
    function re(s, e) {
      return function() {
        const t = this, o = arguments;
        window.setTimeout(() => s.apply(t, o), e);
      };
    }
    function Pt(s) {
      return s.name.split(".").pop();
    }
    function Ft(s) {
      return /^[-\w]+\/([-+\w]+|\*)$/.test(s);
    }
    function Ht(s, e, t) {
      let o;
      return (...i) => {
        const n = this, r = () => {
          o = null, t || s.apply(n, i);
        }, a = t && !o;
        window.clearTimeout(o), o = window.setTimeout(r, e), a && s.apply(n, i);
      };
    }
    function Ce(s, e, t = void 0) {
      let o, i, n, r = null, a = 0;
      t || (t = {});
      const l = function() {
        a = t.leading === !1 ? 0 : Date.now(), r = null, n = s.apply(o, i), r || (o = i = null);
      };
      return function() {
        const c = Date.now();
        !a && t.leading === !1 && (a = c);
        const u = e - (c - a);
        return o = this, i = arguments, u <= 0 || u > e ? (r && (clearTimeout(r), r = null), a = c, n = s.apply(o, i), r || (o = i = null)) : !r && t.trailing !== !1 && (r = setTimeout(l, u)), n;
      };
    }
    function jt() {
      const s = {
        win: !1,
        mac: !1,
        x11: !1,
        linux: !1
      }, e = Object.keys(s).find((t) => window.navigator.appVersion.toLowerCase().indexOf(t) !== -1);
      return e && (s[e] = !0), s;
    }
    function ae(s) {
      return s[0].toUpperCase() + s.slice(1);
    }
    function Se(s, ...e) {
      if (!e.length)
        return s;
      const t = e.shift();
      if (z(s) && z(t))
        for (const o in t)
          z(t[o]) ? (s[o] || Object.assign(s, { [o]: {} }), Se(s[o], t[o])) : Object.assign(s, { [o]: t[o] });
      return Se(s, ...e);
    }
    function Re(s) {
      const e = jt();
      return s = s.replace(/shift/gi, "⇧").replace(/backspace/gi, "⌫").replace(/enter/gi, "⏎").replace(/up/gi, "↑").replace(/left/gi, "→").replace(/down/gi, "↓").replace(/right/gi, "←").replace(/escape/gi, "⎋").replace(/insert/gi, "Ins").replace(/delete/gi, "␡").replace(/\+/gi, " + "), e.mac ? s = s.replace(/ctrl|cmd/gi, "⌘").replace(/alt/gi, "⌥") : s = s.replace(/cmd/gi, "Ctrl").replace(/windows/gi, "WIN"), s;
    }
    function zt(s) {
      try {
        return new URL(s).href;
      } catch {
      }
      return s.substring(0, 2) === "//" ? window.location.protocol + s : window.location.origin + s;
    }
    function Ut() {
      return At(10);
    }
    function $t(s) {
      window.open(s, "_blank");
    }
    function Wt(s = "") {
      return `${s}${Math.floor(Math.random() * 1e8).toString(16)}`;
    }
    function Ie(s, e, t) {
      const o = `«${e}» is deprecated and will be removed in the next major release. Please use the «${t}» instead.`;
      s && K(o, "warn");
    }
    function ce(s, e, t) {
      const o = t.value ? "value" : "get", i = t[o], n = `#${e}Cache`;
      if (t[o] = function(...r) {
        return this[n] === void 0 && (this[n] = i.apply(this, ...r)), this[n];
      }, o === "get" && t.set) {
        const r = t.set;
        t.set = function(a) {
          delete s[n], r.apply(this, a);
        };
      }
      return t;
    }
    const rt = 650;
    function te() {
      return window.matchMedia(`(max-width: ${rt}px)`).matches;
    }
    const Ge = typeof window < "u" && window.navigator && window.navigator.platform && (/iP(ad|hone|od)/.test(window.navigator.platform) || window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    function Yt(s, e) {
      const t = Array.isArray(s) || z(s), o = Array.isArray(e) || z(e);
      return t || o ? JSON.stringify(s) === JSON.stringify(e) : s === e;
    }
    class d {
      /**
       * Check if passed tag has no closed tag
       *
       * @param {HTMLElement} tag - element to check
       * @returns {boolean}
       */
      static isSingleTag(e) {
        return e.tagName && [
          "AREA",
          "BASE",
          "BR",
          "COL",
          "COMMAND",
          "EMBED",
          "HR",
          "IMG",
          "INPUT",
          "KEYGEN",
          "LINK",
          "META",
          "PARAM",
          "SOURCE",
          "TRACK",
          "WBR"
        ].includes(e.tagName);
      }
      /**
       * Check if element is BR or WBR
       *
       * @param {HTMLElement} element - element to check
       * @returns {boolean}
       */
      static isLineBreakTag(e) {
        return e && e.tagName && [
          "BR",
          "WBR"
        ].includes(e.tagName);
      }
      /**
       * Helper for making Elements with class name and attributes
       *
       * @param  {string} tagName - new Element tag name
       * @param  {string[]|string} [classNames] - list or name of CSS class name(s)
       * @param  {object} [attributes] - any attributes
       * @returns {HTMLElement}
       */
      static make(e, t = null, o = {}) {
        const i = document.createElement(e);
        Array.isArray(t) ? i.classList.add(...t) : t && i.classList.add(t);
        for (const n in o)
          Object.prototype.hasOwnProperty.call(o, n) && (i[n] = o[n]);
        return i;
      }
      /**
       * Creates Text Node with the passed content
       *
       * @param {string} content - text content
       * @returns {Text}
       */
      static text(e) {
        return document.createTextNode(e);
      }
      /**
       * Append one or several elements to the parent
       *
       * @param  {Element|DocumentFragment} parent - where to append
       * @param  {Element|Element[]|DocumentFragment|Text|Text[]} elements - element or elements list
       */
      static append(e, t) {
        Array.isArray(t) ? t.forEach((o) => e.appendChild(o)) : e.appendChild(t);
      }
      /**
       * Append element or a couple to the beginning of the parent elements
       *
       * @param {Element} parent - where to append
       * @param {Element|Element[]} elements - element or elements list
       */
      static prepend(e, t) {
        Array.isArray(t) ? (t = t.reverse(), t.forEach((o) => e.prepend(o))) : e.prepend(t);
      }
      /**
       * Swap two elements in parent
       *
       * @param {HTMLElement} el1 - from
       * @param {HTMLElement} el2 - to
       * @deprecated
       */
      static swap(e, t) {
        const o = document.createElement("div"), i = e.parentNode;
        i.insertBefore(o, e), i.insertBefore(e, t), i.insertBefore(t, o), i.removeChild(o);
      }
      /**
       * Selector Decorator
       *
       * Returns first match
       *
       * @param {Element} el - element we searching inside. Default - DOM Document
       * @param {string} selector - searching string
       * @returns {Element}
       */
      static find(e = document, t) {
        return e.querySelector(t);
      }
      /**
       * Get Element by Id
       *
       * @param {string} id - id to find
       * @returns {HTMLElement | null}
       */
      static get(e) {
        return document.getElementById(e);
      }
      /**
       * Selector Decorator.
       *
       * Returns all matches
       *
       * @param {Element|Document} el - element we searching inside. Default - DOM Document
       * @param {string} selector - searching string
       * @returns {NodeList}
       */
      static findAll(e = document, t) {
        return e.querySelectorAll(t);
      }
      /**
       * Returns CSS selector for all text inputs
       */
      static get allInputsSelector() {
        return "[contenteditable=true], textarea, input:not([type]), " + ["text", "password", "email", "number", "search", "tel", "url"].map((t) => `input[type="${t}"]`).join(", ");
      }
      /**
       * Find all contenteditable, textarea and editable input elements passed holder contains
       *
       * @param holder - element where to find inputs
       */
      static findAllInputs(e) {
        return st(e.querySelectorAll(d.allInputsSelector)).reduce((t, o) => d.isNativeInput(o) || d.containsOnlyInlineElements(o) ? [...t, o] : [...t, ...d.getDeepestBlockElements(o)], []);
      }
      /**
       * Search for deepest node which is Leaf.
       * Leaf is the vertex that doesn't have any child nodes
       *
       * @description Method recursively goes throw the all Node until it finds the Leaf
       * @param {Node} node - root Node. From this vertex we start Deep-first search
       *                      {@link https://en.wikipedia.org/wiki/Depth-first_search}
       * @param {boolean} [atLast] - find last text node
       * @returns {Node} - it can be text Node or Element Node, so that caret will able to work with it
       */
      static getDeepestNode(e, t = !1) {
        const o = t ? "lastChild" : "firstChild", i = t ? "previousSibling" : "nextSibling";
        if (e && e.nodeType === Node.ELEMENT_NODE && e[o]) {
          let n = e[o];
          if (d.isSingleTag(n) && !d.isNativeInput(n) && !d.isLineBreakTag(n))
            if (n[i])
              n = n[i];
            else if (n.parentNode[i])
              n = n.parentNode[i];
            else
              return n.parentNode;
          return this.getDeepestNode(n, t);
        }
        return e;
      }
      /**
       * Check if object is DOM node
       *
       * @param {*} node - object to check
       * @returns {boolean}
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      static isElement(e) {
        return qe(e) ? !1 : e && e.nodeType && e.nodeType === Node.ELEMENT_NODE;
      }
      /**
       * Check if object is DocumentFragment node
       *
       * @param {object} node - object to check
       * @returns {boolean}
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      static isFragment(e) {
        return qe(e) ? !1 : e && e.nodeType && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
      }
      /**
       * Check if passed element is contenteditable
       *
       * @param {HTMLElement} element - html element to check
       * @returns {boolean}
       */
      static isContentEditable(e) {
        return e.contentEditable === "true";
      }
      /**
       * Checks target if it is native input
       *
       * @param {*} target - HTML element or string
       * @returns {boolean}
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      static isNativeInput(e) {
        const t = [
          "INPUT",
          "TEXTAREA"
        ];
        return e && e.tagName ? t.includes(e.tagName) : !1;
      }
      /**
       * Checks if we can set caret
       *
       * @param {HTMLElement} target - target to check
       * @returns {boolean}
       */
      static canSetCaret(e) {
        let t = !0;
        if (d.isNativeInput(e))
          switch (e.type) {
            case "file":
            case "checkbox":
            case "radio":
            case "hidden":
            case "submit":
            case "button":
            case "image":
            case "reset":
              t = !1;
              break;
          }
        else
          t = d.isContentEditable(e);
        return t;
      }
      /**
       * Checks node if it is empty
       *
       * @description Method checks simple Node without any childs for emptiness
       * If you have Node with 2 or more children id depth, you better use {@link Dom#isEmpty} method
       * @param {Node} node - node to check
       * @returns {boolean} true if it is empty
       */
      static isNodeEmpty(e) {
        let t;
        return this.isSingleTag(e) && !this.isLineBreakTag(e) ? !1 : (this.isElement(e) && this.isNativeInput(e) ? t = e.value : t = e.textContent.replace("​", ""), t.trim().length === 0);
      }
      /**
       * checks node if it is doesn't have any child nodes
       *
       * @param {Node} node - node to check
       * @returns {boolean}
       */
      static isLeaf(e) {
        return e ? e.childNodes.length === 0 : !1;
      }
      /**
       * breadth-first search (BFS)
       * {@link https://en.wikipedia.org/wiki/Breadth-first_search}
       *
       * @description Pushes to stack all DOM leafs and checks for emptiness
       * @param {Node} node - node to check
       * @returns {boolean}
       */
      static isEmpty(e) {
        e.normalize();
        const t = [e];
        for (; t.length > 0; )
          if (e = t.shift(), !!e) {
            if (this.isLeaf(e) && !this.isNodeEmpty(e))
              return !1;
            e.childNodes && t.push(...Array.from(e.childNodes));
          }
        return !0;
      }
      /**
       * Check if string contains html elements
       *
       * @param {string} str - string to check
       * @returns {boolean}
       */
      static isHTMLString(e) {
        const t = d.make("div");
        return t.innerHTML = e, t.childElementCount > 0;
      }
      /**
       * Return length of node`s text content
       *
       * @param {Node} node - node with content
       * @returns {number}
       */
      static getContentLength(e) {
        return d.isNativeInput(e) ? e.value.length : e.nodeType === Node.TEXT_NODE ? e.length : e.textContent.length;
      }
      /**
       * Return array of names of block html elements
       *
       * @returns {string[]}
       */
      static get blockElements() {
        return [
          "address",
          "article",
          "aside",
          "blockquote",
          "canvas",
          "div",
          "dl",
          "dt",
          "fieldset",
          "figcaption",
          "figure",
          "footer",
          "form",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "header",
          "hgroup",
          "hr",
          "li",
          "main",
          "nav",
          "noscript",
          "ol",
          "output",
          "p",
          "pre",
          "ruby",
          "section",
          "table",
          "tbody",
          "thead",
          "tr",
          "tfoot",
          "ul",
          "video"
        ];
      }
      /**
       * Check if passed content includes only inline elements
       *
       * @param {string|HTMLElement} data - element or html string
       * @returns {boolean}
       */
      static containsOnlyInlineElements(e) {
        let t;
        J(e) ? (t = document.createElement("div"), t.innerHTML = e) : t = e;
        const o = (i) => !d.blockElements.includes(i.tagName.toLowerCase()) && Array.from(i.children).every(o);
        return Array.from(t.children).every(o);
      }
      /**
       * Find and return all block elements in the passed parent (including subtree)
       *
       * @param {HTMLElement} parent - root element
       * @returns {HTMLElement[]}
       */
      static getDeepestBlockElements(e) {
        return d.containsOnlyInlineElements(e) ? [e] : Array.from(e.children).reduce((t, o) => [...t, ...d.getDeepestBlockElements(o)], []);
      }
      /**
       * Helper for get holder from {string} or return HTMLElement
       *
       * @param {string | HTMLElement} element - holder's id or holder's HTML Element
       * @returns {HTMLElement}
       */
      static getHolder(e) {
        return J(e) ? document.getElementById(e) : e;
      }
      /**
       * Returns true if element is anchor (is A tag)
       *
       * @param {Element} element - element to check
       * @returns {boolean}
       */
      static isAnchor(e) {
        return e.tagName.toLowerCase() === "a";
      }
      /**
       * Return element's offset related to the document
       *
       * @todo handle case when editor initialized in scrollable popup
       * @param el - element to compute offset
       */
      static offset(e) {
        const t = e.getBoundingClientRect(), o = window.pageXOffset || document.documentElement.scrollLeft, i = window.pageYOffset || document.documentElement.scrollTop, n = t.top + i, r = t.left + o;
        return {
          top: n,
          left: r,
          bottom: n + t.height,
          right: r + t.width
        };
      }
    }
    const Kt = {
      blockTunes: {
        toggler: {
          "Click to tune": "",
          "or drag to move": ""
        }
      },
      inlineToolbar: {
        converter: {
          "Convert to": ""
        }
      },
      toolbar: {
        toolbox: {
          Add: ""
        }
      },
      popover: {
        Filter: "",
        "Nothing found": ""
      }
    }, Xt = {
      Text: "",
      Link: "",
      Bold: "",
      Italic: ""
    }, Vt = {
      link: {
        "Add a link": ""
      },
      stub: {
        "The block can not be displayed correctly.": ""
      }
    }, qt = {
      delete: {
        Delete: "",
        "Click to delete": ""
      },
      moveUp: {
        "Move up": ""
      },
      moveDown: {
        "Move down": ""
      }
    }, at = {
      ui: Kt,
      toolNames: Xt,
      tools: Vt,
      blockTunes: qt
    }, ie = class {
      /**
       * Type-safe translation for internal UI texts:
       * Perform translation of the string by namespace and a key
       *
       * @example I18n.ui(I18nInternalNS.ui.blockTunes.toggler, 'Click to tune')
       * @param internalNamespace - path to translated string in dictionary
       * @param dictKey - dictionary key. Better to use default locale original text
       */
      static ui(s, e) {
        return ie._t(s, e);
      }
      /**
       * Translate for external strings that is not presented in default dictionary.
       * For example, for user-specified tool names
       *
       * @param namespace - path to translated string in dictionary
       * @param dictKey - dictionary key. Better to use default locale original text
       */
      static t(s, e) {
        return ie._t(s, e);
      }
      /**
       * Adjust module for using external dictionary
       *
       * @param dictionary - new messages list to override default
       */
      static setDictionary(s) {
        ie.currentDictionary = s;
      }
      /**
       * Perform translation both for internal and external namespaces
       * If there is no translation found, returns passed key as a translated message
       *
       * @param namespace - path to translated string in dictionary
       * @param dictKey - dictionary key. Better to use default locale original text
       */
      static _t(s, e) {
        const t = ie.getNamespace(s);
        return !t || !t[e] ? e : t[e];
      }
      /**
       * Find messages section by namespace path
       *
       * @param namespace - path to section
       */
      static getNamespace(s) {
        return s.split(".").reduce((t, o) => !t || !Object.keys(t).length ? {} : t[o], ie.currentDictionary);
      }
    };
    let $ = ie;
    $.currentDictionary = at;
    class lt extends Error {
    }
    class we {
      constructor() {
        this.subscribers = {};
      }
      /**
       * Subscribe any event on callback
       *
       * @param eventName - event name
       * @param callback - subscriber
       */
      on(e, t) {
        e in this.subscribers || (this.subscribers[e] = []), this.subscribers[e].push(t);
      }
      /**
       * Subscribe any event on callback. Callback will be called once and be removed from subscribers array after call.
       *
       * @param eventName - event name
       * @param callback - subscriber
       */
      once(e, t) {
        e in this.subscribers || (this.subscribers[e] = []);
        const o = (i) => {
          const n = t(i), r = this.subscribers[e].indexOf(o);
          return r !== -1 && this.subscribers[e].splice(r, 1), n;
        };
        this.subscribers[e].push(o);
      }
      /**
       * Emit callbacks with passed data
       *
       * @param eventName - event name
       * @param data - subscribers get this data when they were fired
       */
      emit(e, t) {
        V(this.subscribers) || !this.subscribers[e] || this.subscribers[e].reduce((o, i) => {
          const n = i(o);
          return n !== void 0 ? n : o;
        }, t);
      }
      /**
       * Unsubscribe callback from event
       *
       * @param eventName - event name
       * @param callback - event handler
       */
      off(e, t) {
        if (this.subscribers[e] === void 0) {
          console.warn(`EventDispatcher .off(): there is no subscribers for event "${e.toString()}". Probably, .off() called before .on()`);
          return;
        }
        for (let o = 0; o < this.subscribers[e].length; o++)
          if (this.subscribers[e][o] === t) {
            delete this.subscribers[e][o];
            break;
          }
      }
      /**
       * Destroyer
       * clears subscribers list
       */
      destroy() {
        this.subscribers = {};
      }
    }
    function ee(s) {
      Object.setPrototypeOf(this, {
        /**
         * Block id
         *
         * @returns {string}
         */
        get id() {
          return s.id;
        },
        /**
         * Tool name
         *
         * @returns {string}
         */
        get name() {
          return s.name;
        },
        /**
         * Tool config passed on Editor's initialization
         *
         * @returns {ToolConfig}
         */
        get config() {
          return s.config;
        },
        /**
         * .ce-block element, that wraps plugin contents
         *
         * @returns {HTMLElement}
         */
        get holder() {
          return s.holder;
        },
        /**
         * True if Block content is empty
         *
         * @returns {boolean}
         */
        get isEmpty() {
          return s.isEmpty;
        },
        /**
         * True if Block is selected with Cross-Block selection
         *
         * @returns {boolean}
         */
        get selected() {
          return s.selected;
        },
        /**
         * Set Block's stretch state
         *
         * @param {boolean} state — state to set
         */
        set stretched(t) {
          s.stretched = t;
        },
        /**
         * True if Block is stretched
         *
         * @returns {boolean}
         */
        get stretched() {
          return s.stretched;
        },
        /**
         * Call Tool method with errors handler under-the-hood
         *
         * @param {string} methodName - method to call
         * @param {object} param - object with parameters
         * @returns {unknown}
         */
        call(t, o) {
          return s.call(t, o);
        },
        /**
         * Save Block content
         *
         * @returns {Promise<void|SavedData>}
         */
        save() {
          return s.save();
        },
        /**
         * Validate Block data
         *
         * @param {BlockToolData} data - data to validate
         * @returns {Promise<boolean>}
         */
        validate(t) {
          return s.validate(t);
        },
        /**
         * Allows to say Editor that Block was changed. Used to manually trigger Editor's 'onChange' callback
         * Can be useful for block changes invisible for editor core.
         */
        dispatchChange() {
          s.dispatchChange();
        }
      });
    }
    class De {
      constructor() {
        this.allListeners = [];
      }
      /**
       * Assigns event listener on element and returns unique identifier
       *
       * @param {EventTarget} element - DOM element that needs to be listened
       * @param {string} eventType - event type
       * @param {Function} handler - method that will be fired on event
       * @param {boolean|AddEventListenerOptions} options - useCapture or {capture, passive, once}
       */
      on(e, t, o, i = !1) {
        const n = Wt("l"), r = {
          id: n,
          element: e,
          eventType: t,
          handler: o,
          options: i
        };
        if (!this.findOne(e, t, o))
          return this.allListeners.push(r), e.addEventListener(t, o, i), n;
      }
      /**
       * Removes event listener from element
       *
       * @param {EventTarget} element - DOM element that we removing listener
       * @param {string} eventType - event type
       * @param {Function} handler - remove handler, if element listens several handlers on the same event type
       * @param {boolean|AddEventListenerOptions} options - useCapture or {capture, passive, once}
       */
      off(e, t, o, i) {
        const n = this.findAll(e, t, o);
        n.forEach((r, a) => {
          const l = this.allListeners.indexOf(n[a]);
          l > -1 && (this.allListeners.splice(l, 1), r.element.removeEventListener(r.eventType, r.handler, r.options));
        });
      }
      /**
       * Removes listener by id
       *
       * @param {string} id - listener identifier
       */
      offById(e) {
        const t = this.findById(e);
        t && t.element.removeEventListener(t.eventType, t.handler, t.options);
      }
      /**
       * Finds and returns first listener by passed params
       *
       * @param {EventTarget} element - event target
       * @param {string} [eventType] - event type
       * @param {Function} [handler] - event handler
       * @returns {ListenerData|null}
       */
      findOne(e, t, o) {
        const i = this.findAll(e, t, o);
        return i.length > 0 ? i[0] : null;
      }
      /**
       * Return all stored listeners by passed params
       *
       * @param {EventTarget} element - event target
       * @param {string} eventType - event type
       * @param {Function} handler - event handler
       * @returns {ListenerData[]}
       */
      findAll(e, t, o) {
        let i;
        const n = e ? this.findByEventTarget(e) : [];
        return e && t && o ? i = n.filter((r) => r.eventType === t && r.handler === o) : e && t ? i = n.filter((r) => r.eventType === t) : i = n, i;
      }
      /**
       * Removes all listeners
       */
      removeAll() {
        this.allListeners.map((e) => {
          e.element.removeEventListener(e.eventType, e.handler, e.options);
        }), this.allListeners = [];
      }
      /**
       * Module cleanup on destruction
       */
      destroy() {
        this.removeAll();
      }
      /**
       * Search method: looks for listener by passed element
       *
       * @param {EventTarget} element - searching element
       * @returns {Array} listeners that found on element
       */
      findByEventTarget(e) {
        return this.allListeners.filter((t) => {
          if (t.element === e)
            return t;
        });
      }
      /**
       * Search method: looks for listener by passed event type
       *
       * @param {string} eventType - event type
       * @returns {ListenerData[]} listeners that found on element
       */
      findByType(e) {
        return this.allListeners.filter((t) => {
          if (t.eventType === e)
            return t;
        });
      }
      /**
       * Search method: looks for listener by passed handler
       *
       * @param {Function} handler - event handler
       * @returns {ListenerData[]} listeners that found on element
       */
      findByHandler(e) {
        return this.allListeners.filter((t) => {
          if (t.handler === e)
            return t;
        });
      }
      /**
       * Returns listener data found by id
       *
       * @param {string} id - listener identifier
       * @returns {ListenerData}
       */
      findById(e) {
        return this.allListeners.find((t) => t.id === e);
      }
    }
    class C {
      /**
       * @class
       * @param options - Module options
       * @param options.config - Module config
       * @param options.eventsDispatcher - Common event bus
       */
      constructor({ config: e, eventsDispatcher: t }) {
        if (this.nodes = {}, this.listeners = new De(), this.readOnlyMutableListeners = {
          /**
           * Assigns event listener on DOM element and pushes into special array that might be removed
           *
           * @param {EventTarget} element - DOM Element
           * @param {string} eventType - Event name
           * @param {Function} handler - Event handler
           * @param {boolean|AddEventListenerOptions} options - Listening options
           */
          on: (o, i, n, r = !1) => {
            this.mutableListenerIds.push(
              this.listeners.on(o, i, n, r)
            );
          },
          /**
           * Clears all mutable listeners
           */
          clearAll: () => {
            for (const o of this.mutableListenerIds)
              this.listeners.offById(o);
            this.mutableListenerIds = [];
          }
        }, this.mutableListenerIds = [], new.target === C)
          throw new TypeError("Constructors for abstract class Module are not allowed.");
        this.config = e, this.eventsDispatcher = t;
      }
      /**
       * Editor modules setter
       *
       * @param {EditorModules} Editor - Editor's Modules
       */
      set state(e) {
        this.Editor = e;
      }
      /**
       * Remove memorized nodes
       */
      removeAllNodes() {
        for (const e in this.nodes) {
          const t = this.nodes[e];
          t instanceof HTMLElement && t.remove();
        }
      }
      /**
       * Returns true if current direction is RTL (Right-To-Left)
       */
      get isRtl() {
        return this.config.i18n.direction === "rtl";
      }
    }
    class m {
      constructor() {
        this.instance = null, this.selection = null, this.savedSelectionRange = null, this.isFakeBackgroundEnabled = !1, this.commandBackground = "backColor", this.commandRemoveFormat = "removeFormat";
      }
      /**
       * Editor styles
       *
       * @returns {{editorWrapper: string, editorZone: string}}
       */
      static get CSS() {
        return {
          editorWrapper: "codex-editor",
          editorZone: "codex-editor__redactor"
        };
      }
      /**
       * Returns selected anchor
       * {@link https://developer.mozilla.org/ru/docs/Web/API/Selection/anchorNode}
       *
       * @returns {Node|null}
       */
      static get anchorNode() {
        const e = window.getSelection();
        return e ? e.anchorNode : null;
      }
      /**
       * Returns selected anchor element
       *
       * @returns {Element|null}
       */
      static get anchorElement() {
        const e = window.getSelection();
        if (!e)
          return null;
        const t = e.anchorNode;
        return t ? d.isElement(t) ? t : t.parentElement : null;
      }
      /**
       * Returns selection offset according to the anchor node
       * {@link https://developer.mozilla.org/ru/docs/Web/API/Selection/anchorOffset}
       *
       * @returns {number|null}
       */
      static get anchorOffset() {
        const e = window.getSelection();
        return e ? e.anchorOffset : null;
      }
      /**
       * Is current selection range collapsed
       *
       * @returns {boolean|null}
       */
      static get isCollapsed() {
        const e = window.getSelection();
        return e ? e.isCollapsed : null;
      }
      /**
       * Check current selection if it is at Editor's zone
       *
       * @returns {boolean}
       */
      static get isAtEditor() {
        return this.isSelectionAtEditor(m.get());
      }
      /**
       * Check if passed selection is at Editor's zone
       *
       * @param selection - Selection object to check
       */
      static isSelectionAtEditor(e) {
        if (!e)
          return !1;
        let t = e.anchorNode || e.focusNode;
        t && t.nodeType === Node.TEXT_NODE && (t = t.parentNode);
        let o = null;
        return t && t instanceof Element && (o = t.closest(`.${m.CSS.editorZone}`)), o ? o.nodeType === Node.ELEMENT_NODE : !1;
      }
      /**
       * Check if passed range at Editor zone
       *
       * @param range - range to check
       */
      static isRangeAtEditor(e) {
        if (!e)
          return;
        let t = e.startContainer;
        t && t.nodeType === Node.TEXT_NODE && (t = t.parentNode);
        let o = null;
        return t && t instanceof Element && (o = t.closest(`.${m.CSS.editorZone}`)), o ? o.nodeType === Node.ELEMENT_NODE : !1;
      }
      /**
       * Methods return boolean that true if selection exists on the page
       */
      static get isSelectionExists() {
        return !!m.get().anchorNode;
      }
      /**
       * Return first range
       *
       * @returns {Range|null}
       */
      static get range() {
        return this.getRangeFromSelection(this.get());
      }
      /**
       * Returns range from passed Selection object
       *
       * @param selection - Selection object to get Range from
       */
      static getRangeFromSelection(e) {
        return e && e.rangeCount ? e.getRangeAt(0) : null;
      }
      /**
       * Calculates position and size of selected text
       *
       * @returns {DOMRect | ClientRect}
       */
      static get rect() {
        let e = document.selection, t, o = {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        if (e && e.type !== "Control")
          return e = e, t = e.createRange(), o.x = t.boundingLeft, o.y = t.boundingTop, o.width = t.boundingWidth, o.height = t.boundingHeight, o;
        if (!window.getSelection)
          return L("Method window.getSelection is not supported", "warn"), o;
        if (e = window.getSelection(), e.rangeCount === null || isNaN(e.rangeCount))
          return L("Method SelectionUtils.rangeCount is not supported", "warn"), o;
        if (e.rangeCount === 0)
          return o;
        if (t = e.getRangeAt(0).cloneRange(), t.getBoundingClientRect && (o = t.getBoundingClientRect()), o.x === 0 && o.y === 0) {
          const i = document.createElement("span");
          if (i.getBoundingClientRect) {
            i.appendChild(document.createTextNode("​")), t.insertNode(i), o = i.getBoundingClientRect();
            const n = i.parentNode;
            n.removeChild(i), n.normalize();
          }
        }
        return o;
      }
      /**
       * Returns selected text as String
       *
       * @returns {string}
       */
      static get text() {
        return window.getSelection ? window.getSelection().toString() : "";
      }
      /**
       * Returns window SelectionUtils
       * {@link https://developer.mozilla.org/ru/docs/Web/API/Window/getSelection}
       *
       * @returns {Selection}
       */
      static get() {
        return window.getSelection();
      }
      /**
       * Set focus to contenteditable or native input element
       *
       * @param element - element where to set focus
       * @param offset - offset of cursor
       */
      static setCursor(e, t = 0) {
        const o = document.createRange(), i = window.getSelection();
        return d.isNativeInput(e) ? d.canSetCaret(e) ? (e.focus(), e.selectionStart = e.selectionEnd = t, e.getBoundingClientRect()) : void 0 : (o.setStart(e, t), o.setEnd(e, t), i.removeAllRanges(), i.addRange(o), o.getBoundingClientRect());
      }
      /**
       * Check if current range exists and belongs to container
       *
       * @param container - where range should be
       */
      static isRangeInsideContainer(e) {
        const t = m.range;
        return t === null ? !1 : e.contains(t.startContainer);
      }
      /**
       * Adds fake cursor to the current range
       */
      static addFakeCursor() {
        const e = m.range;
        if (e === null)
          return;
        const t = d.make("span", "codex-editor__fake-cursor");
        t.dataset.mutationFree = "true", e.collapse(), e.insertNode(t);
      }
      /**
       * Check if passed element contains a fake cursor
       *
       * @param el - where to check
       */
      static isFakeCursorInsideContainer(e) {
        return d.find(e, ".codex-editor__fake-cursor") !== null;
      }
      /**
       * Removes fake cursor from a container
       *
       * @param container - container to look for
       */
      static removeFakeCursor(e = document.body) {
        const t = d.find(e, ".codex-editor__fake-cursor");
        t && t.remove();
      }
      /**
       * Removes fake background
       */
      removeFakeBackground() {
        this.isFakeBackgroundEnabled && (this.isFakeBackgroundEnabled = !1, document.execCommand(this.commandRemoveFormat));
      }
      /**
       * Sets fake background
       */
      setFakeBackground() {
        document.execCommand(this.commandBackground, !1, "#a8d6ff"), this.isFakeBackgroundEnabled = !0;
      }
      /**
       * Save SelectionUtils's range
       */
      save() {
        this.savedSelectionRange = m.range;
      }
      /**
       * Restore saved SelectionUtils's range
       */
      restore() {
        if (!this.savedSelectionRange)
          return;
        const e = window.getSelection();
        e.removeAllRanges(), e.addRange(this.savedSelectionRange);
      }
      /**
       * Clears saved selection
       */
      clearSaved() {
        this.savedSelectionRange = null;
      }
      /**
       * Collapse current selection
       */
      collapseToEnd() {
        const e = window.getSelection(), t = document.createRange();
        t.selectNodeContents(e.focusNode), t.collapse(!1), e.removeAllRanges(), e.addRange(t);
      }
      /**
       * Looks ahead to find passed tag from current selection
       *
       * @param  {string} tagName       - tag to found
       * @param  {string} [className]   - tag's class name
       * @param  {number} [searchDepth] - count of tags that can be included. For better performance.
       * @returns {HTMLElement|null}
       */
      findParentTag(e, t, o = 10) {
        const i = window.getSelection();
        let n = null;
        return !i || !i.anchorNode || !i.focusNode ? null : ([
          /** the Node in which the selection begins */
          i.anchorNode,
          /** the Node in which the selection ends */
          i.focusNode
        ].forEach((a) => {
          let l = o;
          for (; l > 0 && a.parentNode && !(a.tagName === e && (n = a, t && a.classList && !a.classList.contains(t) && (n = null), n)); )
            a = a.parentNode, l--;
        }), n);
      }
      /**
       * Expands selection range to the passed parent node
       *
       * @param {HTMLElement} element - element which contents should be selected
       */
      expandToTag(e) {
        const t = window.getSelection();
        t.removeAllRanges();
        const o = document.createRange();
        o.selectNodeContents(e), t.addRange(o);
      }
    }
    function Zt(s, e) {
      const { type: t, target: o, addedNodes: i, removedNodes: n } = s;
      if (o === e)
        return !0;
      if (["characterData", "attributes"].includes(t)) {
        const l = o.nodeType === Node.TEXT_NODE ? o.parentNode : o;
        return e.contains(l);
      }
      const r = Array.from(i).some((l) => e.contains(l)), a = Array.from(n).some((l) => e.contains(l));
      return r || a;
    }
    const Me = "redactor dom changed", ct = "block changed", dt = "fake cursor is about to be toggled", ht = "fake cursor have been set";
    function Je(s, e) {
      return s.mergeable && s.name === e.name;
    }
    function Gt(s, e) {
      const t = e == null ? void 0 : e.export;
      return D(t) ? t(s) : J(t) ? s[t] : (t !== void 0 && L("Conversion «export» property must be a string or function. String means key of saved data object to export. Function should export processed string to export."), "");
    }
    function Jt(s, e) {
      const t = e == null ? void 0 : e.import;
      return D(t) ? t(s) : J(t) ? {
        [t]: s
      } : (t !== void 0 && L("Conversion «import» property must be a string or function. String means key of tool data to import. Function accepts a imported string and return composed tool data."), {});
    }
    var q = /* @__PURE__ */ ((s) => (s.APPEND_CALLBACK = "appendCallback", s.RENDERED = "rendered", s.MOVED = "moved", s.UPDATED = "updated", s.REMOVED = "removed", s.ON_PASTE = "onPaste", s))(q || {});
    class F extends we {
      /**
       * @param options - block constructor options
       * @param [options.id] - block's id. Will be generated if omitted.
       * @param options.data - Tool's initial data
       * @param options.tool — block's tool
       * @param options.api - Editor API module for pass it to the Block Tunes
       * @param options.readOnly - Read-Only flag
       * @param [eventBus] - Editor common event bus. Allows to subscribe on some Editor events. Could be omitted when "virtual" Block is created. See BlocksAPI@composeBlockData.
       */
      constructor({
        id: e = Ut(),
        data: t,
        tool: o,
        api: i,
        readOnly: n,
        tunesData: r
      }, a) {
        super(), this.cachedInputs = [], this.toolRenderedElement = null, this.tunesInstances = /* @__PURE__ */ new Map(), this.defaultTunesInstances = /* @__PURE__ */ new Map(), this.unavailableTunesData = {}, this.inputIndex = 0, this.editorEventBus = null, this.handleFocus = () => {
          this.dropInputsCache(), this.updateCurrentInput();
        }, this.didMutated = (l = void 0) => {
          const c = l === void 0, u = l instanceof InputEvent;
          !c && !u && this.detectToolRootChange(l);
          let h;
          c || u ? h = !0 : h = !(l.length > 0 && l.every((k) => {
            const { addedNodes: p, removedNodes: v, target: A } = k;
            return [
              ...Array.from(p),
              ...Array.from(v),
              A
            ].some((_) => d.isElement(_) ? _.dataset.mutationFree === "true" : !1);
          })), h && (this.dropInputsCache(), this.updateCurrentInput(), this.call(
            "updated"
            /* UPDATED */
          ), this.emit("didMutated", this));
        }, this.name = o.name, this.id = e, this.settings = o.settings, this.config = o.settings.config || {}, this.api = i, this.editorEventBus = a || null, this.blockAPI = new ee(this), this.tool = o, this.toolInstance = o.create(t, this.blockAPI, n), this.tunes = o.tunes, this.composeTunes(r), this.holder = this.compose(), window.requestIdleCallback(() => {
          this.watchBlockMutations(), this.addInputEvents();
        });
      }
      /**
       * CSS classes for the Block
       *
       * @returns {{wrapper: string, content: string}}
       */
      static get CSS() {
        return {
          wrapper: "ce-block",
          wrapperStretched: "ce-block--stretched",
          content: "ce-block__content",
          focused: "ce-block--focused",
          selected: "ce-block--selected",
          dropTarget: "ce-block--drop-target"
        };
      }
      /**
       * Find and return all editable elements (contenteditable and native inputs) in the Tool HTML
       *
       * @returns {HTMLElement[]}
       */
      get inputs() {
        if (this.cachedInputs.length !== 0)
          return this.cachedInputs;
        const e = d.findAllInputs(this.holder);
        return this.inputIndex > e.length - 1 && (this.inputIndex = e.length - 1), this.cachedInputs = e, e;
      }
      /**
       * Return current Tool`s input
       *
       * @returns {HTMLElement}
       */
      get currentInput() {
        return this.inputs[this.inputIndex];
      }
      /**
       * Set input index to the passed element
       *
       * @param {HTMLElement | Node} element - HTML Element to set as current input
       */
      set currentInput(e) {
        const t = this.inputs.findIndex((o) => o === e || o.contains(e));
        t !== -1 && (this.inputIndex = t);
      }
      /**
       * Return first Tool`s input
       *
       * @returns {HTMLElement}
       */
      get firstInput() {
        return this.inputs[0];
      }
      /**
       * Return first Tool`s input
       *
       * @returns {HTMLElement}
       */
      get lastInput() {
        const e = this.inputs;
        return e[e.length - 1];
      }
      /**
       * Return next Tool`s input or undefined if it doesn't exist
       *
       * @returns {HTMLElement}
       */
      get nextInput() {
        return this.inputs[this.inputIndex + 1];
      }
      /**
       * Return previous Tool`s input or undefined if it doesn't exist
       *
       * @returns {HTMLElement}
       */
      get previousInput() {
        return this.inputs[this.inputIndex - 1];
      }
      /**
       * Get Block's JSON data
       *
       * @returns {object}
       */
      get data() {
        return this.save().then((e) => e && !V(e.data) ? e.data : {});
      }
      /**
       * Returns tool's sanitizer config
       *
       * @returns {object}
       */
      get sanitize() {
        return this.tool.sanitizeConfig;
      }
      /**
       * is block mergeable
       * We plugin have merge function then we call it mergeable
       *
       * @returns {boolean}
       */
      get mergeable() {
        return D(this.toolInstance.merge);
      }
      /**
       * Check block for emptiness
       *
       * @returns {boolean}
       */
      get isEmpty() {
        const e = d.isEmpty(this.pluginsContent), t = !this.hasMedia;
        return e && t;
      }
      /**
       * Check if block has a media content such as images, iframe and other
       *
       * @returns {boolean}
       */
      get hasMedia() {
        const e = [
          "img",
          "iframe",
          "video",
          "audio",
          "source",
          "input",
          "textarea",
          "twitterwidget"
        ];
        return !!this.holder.querySelector(e.join(","));
      }
      /**
       * Set focused state
       *
       * @param {boolean} state - 'true' to select, 'false' to remove selection
       */
      set focused(e) {
        this.holder.classList.toggle(F.CSS.focused, e);
      }
      /**
       * Get Block's focused state
       */
      get focused() {
        return this.holder.classList.contains(F.CSS.focused);
      }
      /**
       * Set selected state
       * We don't need to mark Block as Selected when it is empty
       *
       * @param {boolean} state - 'true' to select, 'false' to remove selection
       */
      set selected(e) {
        var i, n;
        this.holder.classList.toggle(F.CSS.selected, e);
        const t = e === !0 && m.isRangeInsideContainer(this.holder), o = e === !1 && m.isFakeCursorInsideContainer(this.holder);
        (t || o) && ((i = this.editorEventBus) == null || i.emit(dt, { state: e }), t ? m.addFakeCursor() : m.removeFakeCursor(this.holder), (n = this.editorEventBus) == null || n.emit(ht, { state: e }));
      }
      /**
       * Returns True if it is Selected
       *
       * @returns {boolean}
       */
      get selected() {
        return this.holder.classList.contains(F.CSS.selected);
      }
      /**
       * Set stretched state
       *
       * @param {boolean} state - 'true' to enable, 'false' to disable stretched state
       */
      set stretched(e) {
        this.holder.classList.toggle(F.CSS.wrapperStretched, e);
      }
      /**
       * Return Block's stretched state
       *
       * @returns {boolean}
       */
      get stretched() {
        return this.holder.classList.contains(F.CSS.wrapperStretched);
      }
      /**
       * Toggle drop target state
       *
       * @param {boolean} state - 'true' if block is drop target, false otherwise
       */
      set dropTarget(e) {
        this.holder.classList.toggle(F.CSS.dropTarget, e);
      }
      /**
       * Returns Plugins content
       *
       * @returns {HTMLElement}
       */
      get pluginsContent() {
        return this.toolRenderedElement;
      }
      /**
       * Calls Tool's method
       *
       * Method checks tool property {MethodName}. Fires method with passes params If it is instance of Function
       *
       * @param {string} methodName - method to call
       * @param {object} params - method argument
       */
      call(e, t) {
        if (D(this.toolInstance[e])) {
          e === "appendCallback" && L(
            "`appendCallback` hook is deprecated and will be removed in the next major release. Use `rendered` hook instead",
            "warn"
          );
          try {
            this.toolInstance[e].call(this.toolInstance, t);
          } catch (o) {
            L(`Error during '${e}' call: ${o.message}`, "error");
          }
        }
      }
      /**
       * Call plugins merge method
       *
       * @param {BlockToolData} data - data to merge
       */
      async mergeWith(e) {
        await this.toolInstance.merge(e);
      }
      /**
       * Extracts data from Block
       * Groups Tool's save processing time
       *
       * @returns {object}
       */
      async save() {
        const e = await this.toolInstance.save(this.pluginsContent), t = this.unavailableTunesData;
        [
          ...this.tunesInstances.entries(),
          ...this.defaultTunesInstances.entries()
        ].forEach(([n, r]) => {
          if (D(r.save))
            try {
              t[n] = r.save();
            } catch (a) {
              L(`Tune ${r.constructor.name} save method throws an Error %o`, "warn", a);
            }
        });
        const o = window.performance.now();
        let i;
        return Promise.resolve(e).then((n) => (i = window.performance.now(), {
          id: this.id,
          tool: this.name,
          data: n,
          tunes: t,
          time: i - o
        })).catch((n) => {
          L(`Saving process for ${this.name} tool failed due to the ${n}`, "log", "red");
        });
      }
      /**
       * Uses Tool's validation method to check the correctness of output data
       * Tool's validation method is optional
       *
       * @description Method returns true|false whether data passed the validation or not
       * @param {BlockToolData} data - data to validate
       * @returns {Promise<boolean>} valid
       */
      async validate(e) {
        let t = !0;
        return this.toolInstance.validate instanceof Function && (t = await this.toolInstance.validate(e)), t;
      }
      /**
       * Returns data to render in tunes menu.
       * Splits block tunes settings into 2 groups: popover items and custom html.
       */
      getTunes() {
        const e = document.createElement("div"), t = [], o = typeof this.toolInstance.renderSettings == "function" ? this.toolInstance.renderSettings() : [], i = [
          ...this.tunesInstances.values(),
          ...this.defaultTunesInstances.values()
        ].map((n) => n.render());
        return [o, i].flat().forEach((n) => {
          d.isElement(n) ? e.appendChild(n) : Array.isArray(n) ? t.push(...n) : t.push(n);
        }), [t, e];
      }
      /**
       * Update current input index with selection anchor node
       */
      updateCurrentInput() {
        this.currentInput = d.isNativeInput(document.activeElement) || !m.anchorNode ? document.activeElement : m.anchorNode;
      }
      /**
       * Allows to say Editor that Block was changed. Used to manually trigger Editor's 'onChange' callback
       * Can be useful for block changes invisible for editor core.
       */
      dispatchChange() {
        this.didMutated();
      }
      /**
       * Call Tool instance destroy method
       */
      destroy() {
        this.unwatchBlockMutations(), this.removeInputEvents(), super.destroy(), D(this.toolInstance.destroy) && this.toolInstance.destroy();
      }
      /**
       * Tool could specify several entries to be displayed at the Toolbox (for example, "Heading 1", "Heading 2", "Heading 3")
       * This method returns the entry that is related to the Block (depended on the Block data)
       */
      async getActiveToolboxEntry() {
        const e = this.tool.toolbox;
        if (e.length === 1)
          return Promise.resolve(this.tool.toolbox[0]);
        const t = await this.data;
        return e.find((i) => Object.entries(i.data).some(([n, r]) => t[n] && Yt(t[n], r)));
      }
      /**
       * Exports Block data as string using conversion config
       */
      async exportDataAsString() {
        const e = await this.data;
        return Gt(e, this.tool.conversionConfig);
      }
      /**
       * Make default Block wrappers and put Tool`s content there
       *
       * @returns {HTMLDivElement}
       */
      compose() {
        const e = d.make("div", F.CSS.wrapper), t = d.make("div", F.CSS.content), o = this.toolInstance.render();
        e.dataset.id = this.id, this.toolRenderedElement = o, t.appendChild(this.toolRenderedElement);
        let i = t;
        return [...this.tunesInstances.values(), ...this.defaultTunesInstances.values()].forEach((n) => {
          if (D(n.wrap))
            try {
              i = n.wrap(i);
            } catch (r) {
              L(`Tune ${n.constructor.name} wrap method throws an Error %o`, "warn", r);
            }
        }), e.appendChild(i), e;
      }
      /**
       * Instantiate Block Tunes
       *
       * @param tunesData - current Block tunes data
       * @private
       */
      composeTunes(e) {
        Array.from(this.tunes.values()).forEach((t) => {
          (t.isInternal ? this.defaultTunesInstances : this.tunesInstances).set(t.name, t.create(e[t.name], this.blockAPI));
        }), Object.entries(e).forEach(([t, o]) => {
          this.tunesInstances.has(t) || (this.unavailableTunesData[t] = o);
        });
      }
      /**
       * Adds focus event listeners to all inputs and contenteditable
       */
      addInputEvents() {
        this.inputs.forEach((e) => {
          e.addEventListener("focus", this.handleFocus), d.isNativeInput(e) && e.addEventListener("input", this.didMutated);
        });
      }
      /**
       * removes focus event listeners from all inputs and contenteditable
       */
      removeInputEvents() {
        this.inputs.forEach((e) => {
          e.removeEventListener("focus", this.handleFocus), d.isNativeInput(e) && e.removeEventListener("input", this.didMutated);
        });
      }
      /**
       * Listen common editor Dom Changed event and detect mutations related to the  Block
       */
      watchBlockMutations() {
        var e;
        this.redactorDomChangedCallback = (t) => {
          const { mutations: o } = t;
          o.some((n) => Zt(n, this.toolRenderedElement)) && this.didMutated(o);
        }, (e = this.editorEventBus) == null || e.on(Me, this.redactorDomChangedCallback);
      }
      /**
       * Remove redactor dom change event listener
       */
      unwatchBlockMutations() {
        var e;
        (e = this.editorEventBus) == null || e.off(Me, this.redactorDomChangedCallback);
      }
      /**
       * Sometimes Tool can replace own main element, for example H2 -> H4 or UL -> OL
       * We need to detect such changes and update a link to tools main element with the new one
       *
       * @param mutations - records of block content mutations
       */
      detectToolRootChange(e) {
        e.forEach((t) => {
          if (Array.from(t.removedNodes).includes(this.toolRenderedElement)) {
            const i = t.addedNodes[t.addedNodes.length - 1];
            this.toolRenderedElement = i;
          }
        });
      }
      /**
       * Clears inputs cached value
       */
      dropInputsCache() {
        this.cachedInputs = [];
      }
    }
    class Qt extends C {
      constructor() {
        super(...arguments), this.insert = (e = this.config.defaultBlock, t = {}, o = {}, i, n, r, a) => {
          const l = this.Editor.BlockManager.insert({
            id: a,
            tool: e,
            data: t,
            index: i,
            needToFocus: n,
            replace: r
          });
          return new ee(l);
        }, this.composeBlockData = async (e) => {
          const t = this.Editor.Tools.blockTools.get(e);
          return new F({
            tool: t,
            api: this.Editor.API,
            readOnly: !0,
            data: {},
            tunesData: {}
          }).data;
        }, this.update = async (e, t) => {
          const { BlockManager: o } = this.Editor, i = o.getBlockById(e);
          if (i === void 0)
            throw new Error(`Block with id "${e}" not found`);
          const n = await o.update(i, t);
          return new ee(n);
        }, this.convert = (e, t, o) => {
          var h, f;
          const { BlockManager: i, Tools: n } = this.Editor, r = i.getBlockById(e);
          if (!r)
            throw new Error(`Block with id "${e}" not found`);
          const a = n.blockTools.get(r.name), l = n.blockTools.get(t);
          if (!l)
            throw new Error(`Block Tool with type "${t}" not found`);
          const c = ((h = a == null ? void 0 : a.conversionConfig) == null ? void 0 : h.export) !== void 0, u = ((f = l.conversionConfig) == null ? void 0 : f.import) !== void 0;
          if (c && u)
            i.convert(r, t, o);
          else {
            const k = [
              c ? !1 : ae(r.name),
              u ? !1 : ae(t)
            ].filter(Boolean).join(" and ");
            throw new Error(`Conversion from "${r.name}" to "${t}" is not possible. ${k} tool(s) should provide a "conversionConfig"`);
          }
        }, this.insertMany = (e, t = this.Editor.BlockManager.blocks.length - 1) => {
          this.validateIndex(t);
          const o = e.map(({ id: i, type: n, data: r }) => this.Editor.BlockManager.composeBlock({
            id: i,
            tool: n || this.config.defaultBlock,
            data: r
          }));
          return this.Editor.BlockManager.insertMany(o, t), o.map((i) => new ee(i));
        };
      }
      /**
       * Available methods
       *
       * @returns {Blocks}
       */
      get methods() {
        return {
          clear: () => this.clear(),
          render: (e) => this.render(e),
          renderFromHTML: (e) => this.renderFromHTML(e),
          delete: (e) => this.delete(e),
          swap: (e, t) => this.swap(e, t),
          move: (e, t) => this.move(e, t),
          getBlockByIndex: (e) => this.getBlockByIndex(e),
          getById: (e) => this.getById(e),
          getCurrentBlockIndex: () => this.getCurrentBlockIndex(),
          getBlockIndex: (e) => this.getBlockIndex(e),
          getBlocksCount: () => this.getBlocksCount(),
          stretchBlock: (e, t = !0) => this.stretchBlock(e, t),
          insertNewBlock: () => this.insertNewBlock(),
          insert: this.insert,
          insertMany: this.insertMany,
          update: this.update,
          composeBlockData: this.composeBlockData,
          convert: this.convert
        };
      }
      /**
       * Returns Blocks count
       *
       * @returns {number}
       */
      getBlocksCount() {
        return this.Editor.BlockManager.blocks.length;
      }
      /**
       * Returns current block index
       *
       * @returns {number}
       */
      getCurrentBlockIndex() {
        return this.Editor.BlockManager.currentBlockIndex;
      }
      /**
       * Returns the index of Block by id;
       *
       * @param id - block id
       */
      getBlockIndex(e) {
        const t = this.Editor.BlockManager.getBlockById(e);
        if (!t) {
          K("There is no block with id `" + e + "`", "warn");
          return;
        }
        return this.Editor.BlockManager.getBlockIndex(t);
      }
      /**
       * Returns BlockAPI object by Block index
       *
       * @param {number} index - index to get
       */
      getBlockByIndex(e) {
        const t = this.Editor.BlockManager.getBlockByIndex(e);
        if (t === void 0) {
          K("There is no block at index `" + e + "`", "warn");
          return;
        }
        return new ee(t);
      }
      /**
       * Returns BlockAPI object by Block id
       *
       * @param id - id of block to get
       */
      getById(e) {
        const t = this.Editor.BlockManager.getBlockById(e);
        return t === void 0 ? (K("There is no block with id `" + e + "`", "warn"), null) : new ee(t);
      }
      /**
       * Call Block Manager method that swap Blocks
       *
       * @param {number} fromIndex - position of first Block
       * @param {number} toIndex - position of second Block
       * @deprecated — use 'move' instead
       */
      swap(e, t) {
        L(
          "`blocks.swap()` method is deprecated and will be removed in the next major release. Use `block.move()` method instead",
          "info"
        ), this.Editor.BlockManager.swap(e, t);
      }
      /**
       * Move block from one index to another
       *
       * @param {number} toIndex - index to move to
       * @param {number} fromIndex - index to move from
       */
      move(e, t) {
        this.Editor.BlockManager.move(e, t);
      }
      /**
       * Deletes Block
       *
       * @param {number} blockIndex - index of Block to delete
       */
      delete(e = this.Editor.BlockManager.currentBlockIndex) {
        try {
          const t = this.Editor.BlockManager.getBlockByIndex(e);
          this.Editor.BlockManager.removeBlock(t);
        } catch (t) {
          K(t, "warn");
          return;
        }
        this.Editor.BlockManager.blocks.length === 0 && this.Editor.BlockManager.insert(), this.Editor.BlockManager.currentBlock && this.Editor.Caret.setToBlock(this.Editor.BlockManager.currentBlock, this.Editor.Caret.positions.END), this.Editor.Toolbar.close();
      }
      /**
       * Clear Editor's area
       */
      async clear() {
        await this.Editor.BlockManager.clear(!0), this.Editor.InlineToolbar.close();
      }
      /**
       * Fills Editor with Blocks data
       *
       * @param {OutputData} data — Saved Editor data
       */
      async render(e) {
        if (e === void 0 || e.blocks === void 0)
          throw new Error("Incorrect data passed to the render() method");
        this.Editor.ModificationsObserver.disable(), await this.Editor.BlockManager.clear(), await this.Editor.Renderer.render(e.blocks), this.Editor.ModificationsObserver.enable();
      }
      /**
       * Render passed HTML string
       *
       * @param {string} data - HTML string to render
       * @returns {Promise<void>}
       */
      renderFromHTML(e) {
        return this.Editor.BlockManager.clear(), this.Editor.Paste.processText(e, !0);
      }
      /**
       * Stretch Block's content
       *
       * @param {number} index - index of Block to stretch
       * @param {boolean} status - true to enable, false to disable
       * @deprecated Use BlockAPI interface to stretch Blocks
       */
      stretchBlock(e, t = !0) {
        Ie(
          !0,
          "blocks.stretchBlock()",
          "BlockAPI"
        );
        const o = this.Editor.BlockManager.getBlockByIndex(e);
        o && (o.stretched = t);
      }
      /**
       * Insert new Block
       * After set caret to this Block
       *
       * @todo remove in 3.0.0
       * @deprecated with insert() method
       */
      insertNewBlock() {
        L("Method blocks.insertNewBlock() is deprecated and it will be removed in the next major release. Use blocks.insert() instead.", "warn"), this.insert();
      }
      /**
       * Validated block index and throws an error if it's invalid
       *
       * @param index - index to validate
       */
      validateIndex(e) {
        if (typeof e != "number")
          throw new Error("Index should be a number");
        if (e < 0)
          throw new Error("Index should be greater than or equal to 0");
        if (e === null)
          throw new Error("Index should be greater than or equal to 0");
      }
    }
    class eo extends C {
      constructor() {
        super(...arguments), this.setToFirstBlock = (e = this.Editor.Caret.positions.DEFAULT, t = 0) => this.Editor.BlockManager.firstBlock ? (this.Editor.Caret.setToBlock(this.Editor.BlockManager.firstBlock, e, t), !0) : !1, this.setToLastBlock = (e = this.Editor.Caret.positions.DEFAULT, t = 0) => this.Editor.BlockManager.lastBlock ? (this.Editor.Caret.setToBlock(this.Editor.BlockManager.lastBlock, e, t), !0) : !1, this.setToPreviousBlock = (e = this.Editor.Caret.positions.DEFAULT, t = 0) => this.Editor.BlockManager.previousBlock ? (this.Editor.Caret.setToBlock(this.Editor.BlockManager.previousBlock, e, t), !0) : !1, this.setToNextBlock = (e = this.Editor.Caret.positions.DEFAULT, t = 0) => this.Editor.BlockManager.nextBlock ? (this.Editor.Caret.setToBlock(this.Editor.BlockManager.nextBlock, e, t), !0) : !1, this.setToBlock = (e, t = this.Editor.Caret.positions.DEFAULT, o = 0) => this.Editor.BlockManager.blocks[e] ? (this.Editor.Caret.setToBlock(this.Editor.BlockManager.blocks[e], t, o), !0) : !1, this.focus = (e = !1) => e ? this.setToLastBlock(this.Editor.Caret.positions.END) : this.setToFirstBlock(this.Editor.Caret.positions.START);
      }
      /**
       * Available methods
       *
       * @returns {Caret}
       */
      get methods() {
        return {
          setToFirstBlock: this.setToFirstBlock,
          setToLastBlock: this.setToLastBlock,
          setToPreviousBlock: this.setToPreviousBlock,
          setToNextBlock: this.setToNextBlock,
          setToBlock: this.setToBlock,
          focus: this.focus
        };
      }
    }
    class to extends C {
      /**
       * Available methods
       *
       * @returns {Events}
       */
      get methods() {
        return {
          emit: (e, t) => this.emit(e, t),
          off: (e, t) => this.off(e, t),
          on: (e, t) => this.on(e, t)
        };
      }
      /**
       * Subscribe on Events
       *
       * @param {string} eventName - event name to subscribe
       * @param {Function} callback - event handler
       */
      on(e, t) {
        this.eventsDispatcher.on(e, t);
      }
      /**
       * Emit event with data
       *
       * @param {string} eventName - event to emit
       * @param {object} data - event's data
       */
      emit(e, t) {
        this.eventsDispatcher.emit(e, t);
      }
      /**
       * Unsubscribe from Event
       *
       * @param {string} eventName - event to unsubscribe
       * @param {Function} callback - event handler
       */
      off(e, t) {
        this.eventsDispatcher.off(e, t);
      }
    }
    class Pe extends C {
      /**
       * Return namespace section for tool or block tune
       *
       * @param tool - tool object
       */
      static getNamespace(e) {
        return e.isTune() ? `blockTunes.${e.name}` : `tools.${e.name}`;
      }
      /**
       * Return I18n API methods with global dictionary access
       */
      get methods() {
        return {
          t: () => {
            K("I18n.t() method can be accessed only from Tools", "warn");
          }
        };
      }
      /**
       * Return I18n API methods with tool namespaced dictionary
       *
       * @param tool - Tool object
       */
      getMethodsForTool(e) {
        return Object.assign(
          this.methods,
          {
            t: (t) => $.t(Pe.getNamespace(e), t)
          }
        );
      }
    }
    class oo extends C {
      /**
       * Editor.js Core API modules
       */
      get methods() {
        return {
          blocks: this.Editor.BlocksAPI.methods,
          caret: this.Editor.CaretAPI.methods,
          events: this.Editor.EventsAPI.methods,
          listeners: this.Editor.ListenersAPI.methods,
          notifier: this.Editor.NotifierAPI.methods,
          sanitizer: this.Editor.SanitizerAPI.methods,
          saver: this.Editor.SaverAPI.methods,
          selection: this.Editor.SelectionAPI.methods,
          styles: this.Editor.StylesAPI.classes,
          toolbar: this.Editor.ToolbarAPI.methods,
          inlineToolbar: this.Editor.InlineToolbarAPI.methods,
          tooltip: this.Editor.TooltipAPI.methods,
          i18n: this.Editor.I18nAPI.methods,
          readOnly: this.Editor.ReadOnlyAPI.methods,
          ui: this.Editor.UiAPI.methods
        };
      }
      /**
       * Returns Editor.js Core API methods for passed tool
       *
       * @param tool - tool object
       */
      getMethodsForTool(e) {
        return Object.assign(
          this.methods,
          {
            i18n: this.Editor.I18nAPI.getMethodsForTool(e)
          }
        );
      }
    }
    class io extends C {
      /**
       * Available methods
       *
       * @returns {InlineToolbar}
       */
      get methods() {
        return {
          close: () => this.close(),
          open: () => this.open()
        };
      }
      /**
       * Open Inline Toolbar
       */
      open() {
        this.Editor.InlineToolbar.tryToShow();
      }
      /**
       * Close Inline Toolbar
       */
      close() {
        this.Editor.InlineToolbar.close();
      }
    }
    class no extends C {
      /**
       * Available methods
       *
       * @returns {Listeners}
       */
      get methods() {
        return {
          on: (e, t, o, i) => this.on(e, t, o, i),
          off: (e, t, o, i) => this.off(e, t, o, i),
          offById: (e) => this.offById(e)
        };
      }
      /**
       * Ads a DOM event listener. Return it's id.
       *
       * @param {HTMLElement} element - Element to set handler to
       * @param {string} eventType - event type
       * @param {() => void} handler - event handler
       * @param {boolean} useCapture - capture event or not
       */
      on(e, t, o, i) {
        return this.listeners.on(e, t, o, i);
      }
      /**
       * Removes DOM listener from element
       *
       * @param {Element} element - Element to remove handler from
       * @param eventType - event type
       * @param handler - event handler
       * @param {boolean} useCapture - capture event or not
       */
      off(e, t, o, i) {
        this.listeners.off(e, t, o, i);
      }
      /**
       * Removes DOM listener by the listener id
       *
       * @param id - id of the listener to remove
       */
      offById(e) {
        this.listeners.offById(e);
      }
    }
    var Le = {}, so = {
      get exports() {
        return Le;
      },
      set exports(s) {
        Le = s;
      }
    };
    (function(s, e) {
      (function(t, o) {
        s.exports = o();
      })(window, function() {
        return function(t) {
          var o = {};
          function i(n) {
            if (o[n])
              return o[n].exports;
            var r = o[n] = { i: n, l: !1, exports: {} };
            return t[n].call(r.exports, r, r.exports, i), r.l = !0, r.exports;
          }
          return i.m = t, i.c = o, i.d = function(n, r, a) {
            i.o(n, r) || Object.defineProperty(n, r, { enumerable: !0, get: a });
          }, i.r = function(n) {
            typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(n, "__esModule", { value: !0 });
          }, i.t = function(n, r) {
            if (1 & r && (n = i(n)), 8 & r || 4 & r && typeof n == "object" && n && n.__esModule)
              return n;
            var a = /* @__PURE__ */ Object.create(null);
            if (i.r(a), Object.defineProperty(a, "default", { enumerable: !0, value: n }), 2 & r && typeof n != "string")
              for (var l in n)
                i.d(a, l, function(c) {
                  return n[c];
                }.bind(null, l));
            return a;
          }, i.n = function(n) {
            var r = n && n.__esModule ? function() {
              return n.default;
            } : function() {
              return n;
            };
            return i.d(r, "a", r), r;
          }, i.o = function(n, r) {
            return Object.prototype.hasOwnProperty.call(n, r);
          }, i.p = "/", i(i.s = 0);
        }([function(t, o, i) {
          i(1), /*!
           * Codex JavaScript Notification module
           * https://github.com/codex-team/js-notifier
           */
          t.exports = function() {
            var n = i(6), r = "cdx-notify--bounce-in", a = null;
            return { show: function(l) {
              if (l.message) {
                (function() {
                  if (a)
                    return !0;
                  a = n.getWrapper(), document.body.appendChild(a);
                })();
                var c = null, u = l.time || 8e3;
                switch (l.type) {
                  case "confirm":
                    c = n.confirm(l);
                    break;
                  case "prompt":
                    c = n.prompt(l);
                    break;
                  default:
                    c = n.alert(l), window.setTimeout(function() {
                      c.remove();
                    }, u);
                }
                a.appendChild(c), c.classList.add(r);
              }
            } };
          }();
        }, function(t, o, i) {
          var n = i(2);
          typeof n == "string" && (n = [[t.i, n, ""]]);
          var r = { hmr: !0, transform: void 0, insertInto: void 0 };
          i(4)(n, r), n.locals && (t.exports = n.locals);
        }, function(t, o, i) {
          (t.exports = i(3)(!1)).push([t.i, `.cdx-notify--error{background:#fffbfb!important}.cdx-notify--error::before{background:#fb5d5d!important}.cdx-notify__input{max-width:130px;padding:5px 10px;background:#f7f7f7;border:0;border-radius:3px;font-size:13px;color:#656b7c;outline:0}.cdx-notify__input:-ms-input-placeholder{color:#656b7c}.cdx-notify__input::placeholder{color:#656b7c}.cdx-notify__input:focus:-ms-input-placeholder{color:rgba(101,107,124,.3)}.cdx-notify__input:focus::placeholder{color:rgba(101,107,124,.3)}.cdx-notify__button{border:none;border-radius:3px;font-size:13px;padding:5px 10px;cursor:pointer}.cdx-notify__button:last-child{margin-left:10px}.cdx-notify__button--cancel{background:#f2f5f7;box-shadow:0 2px 1px 0 rgba(16,19,29,0);color:#656b7c}.cdx-notify__button--cancel:hover{background:#eee}.cdx-notify__button--confirm{background:#34c992;box-shadow:0 1px 1px 0 rgba(18,49,35,.05);color:#fff}.cdx-notify__button--confirm:hover{background:#33b082}.cdx-notify__btns-wrapper{display:-ms-flexbox;display:flex;-ms-flex-flow:row nowrap;flex-flow:row nowrap;margin-top:5px}.cdx-notify__cross{position:absolute;top:5px;right:5px;width:10px;height:10px;padding:5px;opacity:.54;cursor:pointer}.cdx-notify__cross::after,.cdx-notify__cross::before{content:'';position:absolute;left:9px;top:5px;height:12px;width:2px;background:#575d67}.cdx-notify__cross::before{transform:rotate(-45deg)}.cdx-notify__cross::after{transform:rotate(45deg)}.cdx-notify__cross:hover{opacity:1}.cdx-notifies{position:fixed;z-index:2;bottom:20px;left:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif}.cdx-notify{position:relative;width:220px;margin-top:15px;padding:13px 16px;background:#fff;box-shadow:0 11px 17px 0 rgba(23,32,61,.13);border-radius:5px;font-size:14px;line-height:1.4em;word-wrap:break-word}.cdx-notify::before{content:'';position:absolute;display:block;top:0;left:0;width:3px;height:calc(100% - 6px);margin:3px;border-radius:5px;background:0 0}@keyframes bounceIn{0%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.05)}70%{transform:scale(.9)}100%{transform:scale(1)}}.cdx-notify--bounce-in{animation-name:bounceIn;animation-duration:.6s;animation-iteration-count:1}.cdx-notify--success{background:#fafffe!important}.cdx-notify--success::before{background:#41ffb1!important}`, ""]);
        }, function(t, o) {
          t.exports = function(i) {
            var n = [];
            return n.toString = function() {
              return this.map(function(r) {
                var a = function(l, c) {
                  var u = l[1] || "", h = l[3];
                  if (!h)
                    return u;
                  if (c && typeof btoa == "function") {
                    var f = (p = h, "/*# sourceMappingURL=data:application/json;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(p)))) + " */"), k = h.sources.map(function(v) {
                      return "/*# sourceURL=" + h.sourceRoot + v + " */";
                    });
                    return [u].concat(k).concat([f]).join(`
`);
                  }
                  var p;
                  return [u].join(`
`);
                }(r, i);
                return r[2] ? "@media " + r[2] + "{" + a + "}" : a;
              }).join("");
            }, n.i = function(r, a) {
              typeof r == "string" && (r = [[null, r, ""]]);
              for (var l = {}, c = 0; c < this.length; c++) {
                var u = this[c][0];
                typeof u == "number" && (l[u] = !0);
              }
              for (c = 0; c < r.length; c++) {
                var h = r[c];
                typeof h[0] == "number" && l[h[0]] || (a && !h[2] ? h[2] = a : a && (h[2] = "(" + h[2] + ") and (" + a + ")"), n.push(h));
              }
            }, n;
          };
        }, function(t, o, i) {
          var n, r, a = {}, l = (n = function() {
            return window && document && document.all && !window.atob;
          }, function() {
            return r === void 0 && (r = n.apply(this, arguments)), r;
          }), c = function(b) {
            var g = {};
            return function(E) {
              if (typeof E == "function")
                return E();
              if (g[E] === void 0) {
                var T = function(O) {
                  return document.querySelector(O);
                }.call(this, E);
                if (window.HTMLIFrameElement && T instanceof window.HTMLIFrameElement)
                  try {
                    T = T.contentDocument.head;
                  } catch {
                    T = null;
                  }
                g[E] = T;
              }
              return g[E];
            };
          }(), u = null, h = 0, f = [], k = i(5);
          function p(b, g) {
            for (var E = 0; E < b.length; E++) {
              var T = b[E], O = a[T.id];
              if (O) {
                O.refs++;
                for (var S = 0; S < O.parts.length; S++)
                  O.parts[S](T.parts[S]);
                for (; S < T.parts.length; S++)
                  O.parts.push(x(T.parts[S], g));
              } else {
                var H = [];
                for (S = 0; S < T.parts.length; S++)
                  H.push(x(T.parts[S], g));
                a[T.id] = { id: T.id, refs: 1, parts: H };
              }
            }
          }
          function v(b, g) {
            for (var E = [], T = {}, O = 0; O < b.length; O++) {
              var S = b[O], H = g.base ? S[0] + g.base : S[0], M = { css: S[1], media: S[2], sourceMap: S[3] };
              T[H] ? T[H].parts.push(M) : E.push(T[H] = { id: H, parts: [M] });
            }
            return E;
          }
          function A(b, g) {
            var E = c(b.insertInto);
            if (!E)
              throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
            var T = f[f.length - 1];
            if (b.insertAt === "top")
              T ? T.nextSibling ? E.insertBefore(g, T.nextSibling) : E.appendChild(g) : E.insertBefore(g, E.firstChild), f.push(g);
            else if (b.insertAt === "bottom")
              E.appendChild(g);
            else {
              if (typeof b.insertAt != "object" || !b.insertAt.before)
                throw new Error(`[Style Loader]

 Invalid value for parameter 'insertAt' ('options.insertAt') found.
 Must be 'top', 'bottom', or Object.
 (https://github.com/webpack-contrib/style-loader#insertat)
`);
              var O = c(b.insertInto + " " + b.insertAt.before);
              E.insertBefore(g, O);
            }
          }
          function N(b) {
            if (b.parentNode === null)
              return !1;
            b.parentNode.removeChild(b);
            var g = f.indexOf(b);
            g >= 0 && f.splice(g, 1);
          }
          function _(b) {
            var g = document.createElement("style");
            return b.attrs.type === void 0 && (b.attrs.type = "text/css"), y(g, b.attrs), A(b, g), g;
          }
          function y(b, g) {
            Object.keys(g).forEach(function(E) {
              b.setAttribute(E, g[E]);
            });
          }
          function x(b, g) {
            var E, T, O, S;
            if (g.transform && b.css) {
              if (!(S = g.transform(b.css)))
                return function() {
                };
              b.css = S;
            }
            if (g.singleton) {
              var H = h++;
              E = u || (u = _(g)), T = R.bind(null, E, H, !1), O = R.bind(null, E, H, !0);
            } else
              b.sourceMap && typeof URL == "function" && typeof URL.createObjectURL == "function" && typeof URL.revokeObjectURL == "function" && typeof Blob == "function" && typeof btoa == "function" ? (E = function(M) {
                var W = document.createElement("link");
                return M.attrs.type === void 0 && (M.attrs.type = "text/css"), M.attrs.rel = "stylesheet", y(W, M.attrs), A(M, W), W;
              }(g), T = function(M, W, de) {
                var Q = de.css, Ee = de.sourceMap, Mt = W.convertToAbsoluteUrls === void 0 && Ee;
                (W.convertToAbsoluteUrls || Mt) && (Q = k(Q)), Ee && (Q += `
/*# sourceMappingURL=data:application/json;base64,` + btoa(unescape(encodeURIComponent(JSON.stringify(Ee)))) + " */");
                var Lt = new Blob([Q], { type: "text/css" }), Ve = M.href;
                M.href = URL.createObjectURL(Lt), Ve && URL.revokeObjectURL(Ve);
              }.bind(null, E, g), O = function() {
                N(E), E.href && URL.revokeObjectURL(E.href);
              }) : (E = _(g), T = function(M, W) {
                var de = W.css, Q = W.media;
                if (Q && M.setAttribute("media", Q), M.styleSheet)
                  M.styleSheet.cssText = de;
                else {
                  for (; M.firstChild; )
                    M.removeChild(M.firstChild);
                  M.appendChild(document.createTextNode(de));
                }
              }.bind(null, E), O = function() {
                N(E);
              });
            return T(b), function(M) {
              if (M) {
                if (M.css === b.css && M.media === b.media && M.sourceMap === b.sourceMap)
                  return;
                T(b = M);
              } else
                O();
            };
          }
          t.exports = function(b, g) {
            if (typeof DEBUG < "u" && DEBUG && typeof document != "object")
              throw new Error("The style-loader cannot be used in a non-browser environment");
            (g = g || {}).attrs = typeof g.attrs == "object" ? g.attrs : {}, g.singleton || typeof g.singleton == "boolean" || (g.singleton = l()), g.insertInto || (g.insertInto = "head"), g.insertAt || (g.insertAt = "bottom");
            var E = v(b, g);
            return p(E, g), function(T) {
              for (var O = [], S = 0; S < E.length; S++) {
                var H = E[S];
                (M = a[H.id]).refs--, O.push(M);
              }
              for (T && p(v(T, g), g), S = 0; S < O.length; S++) {
                var M;
                if ((M = O[S]).refs === 0) {
                  for (var W = 0; W < M.parts.length; W++)
                    M.parts[W]();
                  delete a[M.id];
                }
              }
            };
          };
          var w, I = (w = [], function(b, g) {
            return w[b] = g, w.filter(Boolean).join(`
`);
          });
          function R(b, g, E, T) {
            var O = E ? "" : T.css;
            if (b.styleSheet)
              b.styleSheet.cssText = I(g, O);
            else {
              var S = document.createTextNode(O), H = b.childNodes;
              H[g] && b.removeChild(H[g]), H.length ? b.insertBefore(S, H[g]) : b.appendChild(S);
            }
          }
        }, function(t, o) {
          t.exports = function(i) {
            var n = typeof window < "u" && window.location;
            if (!n)
              throw new Error("fixUrls requires window.location");
            if (!i || typeof i != "string")
              return i;
            var r = n.protocol + "//" + n.host, a = r + n.pathname.replace(/\/[^\/]*$/, "/");
            return i.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi, function(l, c) {
              var u, h = c.trim().replace(/^"(.*)"$/, function(f, k) {
                return k;
              }).replace(/^'(.*)'$/, function(f, k) {
                return k;
              });
              return /^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(h) ? l : (u = h.indexOf("//") === 0 ? h : h.indexOf("/") === 0 ? r + h : a + h.replace(/^\.\//, ""), "url(" + JSON.stringify(u) + ")");
            });
          };
        }, function(t, o, i) {
          var n, r, a, l, c, u, h, f, k;
          t.exports = (n = "cdx-notifies", r = "cdx-notify", a = "cdx-notify__cross", l = "cdx-notify__button--confirm", c = "cdx-notify__button--cancel", u = "cdx-notify__input", h = "cdx-notify__button", f = "cdx-notify__btns-wrapper", { alert: k = function(p) {
            var v = document.createElement("DIV"), A = document.createElement("DIV"), N = p.message, _ = p.style;
            return v.classList.add(r), _ && v.classList.add(r + "--" + _), v.innerHTML = N, A.classList.add(a), A.addEventListener("click", v.remove.bind(v)), v.appendChild(A), v;
          }, confirm: function(p) {
            var v = k(p), A = document.createElement("div"), N = document.createElement("button"), _ = document.createElement("button"), y = v.querySelector("." + a), x = p.cancelHandler, w = p.okHandler;
            return A.classList.add(f), N.innerHTML = p.okText || "Confirm", _.innerHTML = p.cancelText || "Cancel", N.classList.add(h), _.classList.add(h), N.classList.add(l), _.classList.add(c), x && typeof x == "function" && (_.addEventListener("click", x), y.addEventListener("click", x)), w && typeof w == "function" && N.addEventListener("click", w), N.addEventListener("click", v.remove.bind(v)), _.addEventListener("click", v.remove.bind(v)), A.appendChild(N), A.appendChild(_), v.appendChild(A), v;
          }, prompt: function(p) {
            var v = k(p), A = document.createElement("div"), N = document.createElement("button"), _ = document.createElement("input"), y = v.querySelector("." + a), x = p.cancelHandler, w = p.okHandler;
            return A.classList.add(f), N.innerHTML = p.okText || "Ok", N.classList.add(h), N.classList.add(l), _.classList.add(u), p.placeholder && _.setAttribute("placeholder", p.placeholder), p.default && (_.value = p.default), p.inputType && (_.type = p.inputType), x && typeof x == "function" && y.addEventListener("click", x), w && typeof w == "function" && N.addEventListener("click", function() {
              w(_.value);
            }), N.addEventListener("click", v.remove.bind(v)), A.appendChild(_), A.appendChild(N), v.appendChild(A), v;
          }, getWrapper: function() {
            var p = document.createElement("DIV");
            return p.classList.add(n), p;
          } });
        }]);
      });
    })(so);
    const ro = /* @__PURE__ */ xe(Le);
    class ao {
      /**
       * Show web notification
       *
       * @param {NotifierOptions | ConfirmNotifierOptions | PromptNotifierOptions} options - notification options
       */
      show(e) {
        ro.show(e);
      }
    }
    class lo extends C {
      /**
       * @param moduleConfiguration - Module Configuration
       * @param moduleConfiguration.config - Editor's config
       * @param moduleConfiguration.eventsDispatcher - Editor's event dispatcher
       */
      constructor({ config: e, eventsDispatcher: t }) {
        super({
          config: e,
          eventsDispatcher: t
        }), this.notifier = new ao();
      }
      /**
       * Available methods
       */
      get methods() {
        return {
          show: (e) => this.show(e)
        };
      }
      /**
       * Show notification
       *
       * @param {NotifierOptions} options - message option
       */
      show(e) {
        return this.notifier.show(e);
      }
    }
    class co extends C {
      /**
       * Available methods
       */
      get methods() {
        const e = () => this.isEnabled;
        return {
          toggle: (t) => this.toggle(t),
          get isEnabled() {
            return e();
          }
        };
      }
      /**
       * Set or toggle read-only state
       *
       * @param {boolean|undefined} state - set or toggle state
       * @returns {boolean} current value
       */
      toggle(e) {
        return this.Editor.ReadOnly.toggle(e);
      }
      /**
       * Returns current read-only state
       */
      get isEnabled() {
        return this.Editor.ReadOnly.isEnabled;
      }
    }
    var Oe = {}, ho = {
      get exports() {
        return Oe;
      },
      set exports(s) {
        Oe = s;
      }
    };
    (function(s, e) {
      (function(t, o) {
        s.exports = o();
      })(Ot, function() {
        function t(h) {
          var f = h.tags, k = Object.keys(f), p = k.map(function(v) {
            return typeof f[v];
          }).every(function(v) {
            return v === "object" || v === "boolean" || v === "function";
          });
          if (!p)
            throw new Error("The configuration was invalid");
          this.config = h;
        }
        var o = ["P", "LI", "TD", "TH", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "PRE"];
        function i(h) {
          return o.indexOf(h.nodeName) !== -1;
        }
        var n = ["A", "B", "STRONG", "I", "EM", "SUB", "SUP", "U", "STRIKE"];
        function r(h) {
          return n.indexOf(h.nodeName) !== -1;
        }
        t.prototype.clean = function(h) {
          const f = document.implementation.createHTMLDocument(), k = f.createElement("div");
          return k.innerHTML = h, this._sanitize(f, k), k.innerHTML;
        }, t.prototype._sanitize = function(h, f) {
          var k = a(h, f), p = k.firstChild();
          if (p)
            do {
              if (p.nodeType === Node.TEXT_NODE)
                if (p.data.trim() === "" && (p.previousElementSibling && i(p.previousElementSibling) || p.nextElementSibling && i(p.nextElementSibling))) {
                  f.removeChild(p), this._sanitize(h, f);
                  break;
                } else
                  continue;
              if (p.nodeType === Node.COMMENT_NODE) {
                f.removeChild(p), this._sanitize(h, f);
                break;
              }
              var v = r(p), A;
              v && (A = Array.prototype.some.call(p.childNodes, i));
              var N = !!f.parentNode, _ = i(f) && i(p) && N, y = p.nodeName.toLowerCase(), x = l(this.config, y, p), w = v && A;
              if (w || c(p, x) || !this.config.keepNestedBlockElements && _) {
                if (!(p.nodeName === "SCRIPT" || p.nodeName === "STYLE"))
                  for (; p.childNodes.length > 0; )
                    f.insertBefore(p.childNodes[0], p);
                f.removeChild(p), this._sanitize(h, f);
                break;
              }
              for (var I = 0; I < p.attributes.length; I += 1) {
                var R = p.attributes[I];
                u(R, x, p) && (p.removeAttribute(R.name), I = I - 1);
              }
              this._sanitize(h, p);
            } while (p = k.nextSibling());
        };
        function a(h, f) {
          return h.createTreeWalker(
            f,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
            null,
            !1
          );
        }
        function l(h, f, k) {
          return typeof h.tags[f] == "function" ? h.tags[f](k) : h.tags[f];
        }
        function c(h, f) {
          return typeof f > "u" ? !0 : typeof f == "boolean" ? !f : !1;
        }
        function u(h, f, k) {
          var p = h.name.toLowerCase();
          return f === !0 ? !1 : typeof f[p] == "function" ? !f[p](h.value, k) : typeof f[p] > "u" || f[p] === !1 ? !0 : typeof f[p] == "string" ? f[p] !== h.value : !1;
        }
        return t;
      });
    })(ho);
    const uo = Oe;
    function ut(s, e) {
      return s.map((t) => {
        const o = D(e) ? e(t.tool) : e;
        return V(o) || (t.data = Fe(t.data, o)), t;
      });
    }
    function Z(s, e = {}) {
      const t = {
        tags: e
      };
      return new uo(t).clean(s);
    }
    function Fe(s, e) {
      return Array.isArray(s) ? po(s, e) : z(s) ? fo(s, e) : J(s) ? go(s, e) : s;
    }
    function po(s, e) {
      return s.map((t) => Fe(t, e));
    }
    function fo(s, e) {
      const t = {};
      for (const o in s) {
        if (!Object.prototype.hasOwnProperty.call(s, o))
          continue;
        const i = s[o], n = bo(e[o]) ? e[o] : e;
        t[o] = Fe(i, n);
      }
      return t;
    }
    function go(s, e) {
      return z(e) ? Z(s, e) : e === !1 ? Z(s, {}) : s;
    }
    function bo(s) {
      return z(s) || Rt(s) || D(s);
    }
    class mo extends C {
      /**
       * Available methods
       *
       * @returns {SanitizerConfig}
       */
      get methods() {
        return {
          clean: (e, t) => this.clean(e, t)
        };
      }
      /**
       * Perform sanitizing of a string
       *
       * @param {string} taintString - what to sanitize
       * @param {SanitizerConfig} config - sanitizer config
       * @returns {string}
       */
      clean(e, t) {
        return Z(e, t);
      }
    }
    class ko extends C {
      /**
       * Available methods
       *
       * @returns {Saver}
       */
      get methods() {
        return {
          save: () => this.save()
        };
      }
      /**
       * Return Editor's data
       *
       * @returns {OutputData}
       */
      save() {
        const e = "Editor's content can not be saved in read-only mode";
        return this.Editor.ReadOnly.isEnabled ? (K(e, "warn"), Promise.reject(new Error(e))) : this.Editor.Saver.save();
      }
    }
    class vo extends C {
      /**
       * Available methods
       *
       * @returns {SelectionAPIInterface}
       */
      get methods() {
        return {
          findParentTag: (e, t) => this.findParentTag(e, t),
          expandToTag: (e) => this.expandToTag(e)
        };
      }
      /**
       * Looks ahead from selection and find passed tag with class name
       *
       * @param {string} tagName - tag to find
       * @param {string} className - tag's class name
       * @returns {HTMLElement|null}
       */
      findParentTag(e, t) {
        return new m().findParentTag(e, t);
      }
      /**
       * Expand selection to passed tag
       *
       * @param {HTMLElement} node - tag that should contain selection
       */
      expandToTag(e) {
        new m().expandToTag(e);
      }
    }
    class xo extends C {
      /**
       * Exported classes
       */
      get classes() {
        return {
          /**
           * Base Block styles
           */
          block: "cdx-block",
          /**
           * Inline Tools styles
           */
          inlineToolButton: "ce-inline-tool",
          inlineToolButtonActive: "ce-inline-tool--active",
          /**
           * UI elements
           */
          input: "cdx-input",
          loader: "cdx-loader",
          button: "cdx-button",
          /**
           * Settings styles
           */
          settingsButton: "cdx-settings-button",
          settingsButtonActive: "cdx-settings-button--active"
        };
      }
    }
    class wo extends C {
      /**
       * Available methods
       *
       * @returns {Toolbar}
       */
      get methods() {
        return {
          close: () => this.close(),
          open: () => this.open(),
          toggleBlockSettings: (e) => this.toggleBlockSettings(e),
          toggleToolbox: (e) => this.toggleToolbox(e)
        };
      }
      /**
       * Open toolbar
       */
      open() {
        this.Editor.Toolbar.moveAndOpen();
      }
      /**
       * Close toolbar and all included elements
       */
      close() {
        this.Editor.Toolbar.close();
      }
      /**
       * Toggles Block Setting of the current block
       *
       * @param {boolean} openingState —  opening state of Block Setting
       */
      toggleBlockSettings(e) {
        if (this.Editor.BlockManager.currentBlockIndex === -1) {
          K("Could't toggle the Toolbar because there is no block selected ", "warn");
          return;
        }
        e ?? !this.Editor.BlockSettings.opened ? (this.Editor.Toolbar.moveAndOpen(), this.Editor.BlockSettings.open()) : this.Editor.BlockSettings.close();
      }
      /**
       * Open toolbox
       *
       * @param {boolean} openingState - Opening state of toolbox
       */
      toggleToolbox(e) {
        if (this.Editor.BlockManager.currentBlockIndex === -1) {
          K("Could't toggle the Toolbox because there is no block selected ", "warn");
          return;
        }
        e ?? !this.Editor.Toolbar.toolbox.opened ? (this.Editor.Toolbar.moveAndOpen(), this.Editor.Toolbar.toolbox.open()) : this.Editor.Toolbar.toolbox.close();
      }
    }
    var Ae = {}, yo = {
      get exports() {
        return Ae;
      },
      set exports(s) {
        Ae = s;
      }
    };
    /*!
     * CodeX.Tooltips
     * 
     * @version 1.0.5
     * 
     * @licence MIT
     * @author CodeX <https://codex.so>
     * 
     * 
     */
    (function(s, e) {
      (function(t, o) {
        s.exports = o();
      })(window, function() {
        return function(t) {
          var o = {};
          function i(n) {
            if (o[n])
              return o[n].exports;
            var r = o[n] = { i: n, l: !1, exports: {} };
            return t[n].call(r.exports, r, r.exports, i), r.l = !0, r.exports;
          }
          return i.m = t, i.c = o, i.d = function(n, r, a) {
            i.o(n, r) || Object.defineProperty(n, r, { enumerable: !0, get: a });
          }, i.r = function(n) {
            typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(n, "__esModule", { value: !0 });
          }, i.t = function(n, r) {
            if (1 & r && (n = i(n)), 8 & r || 4 & r && typeof n == "object" && n && n.__esModule)
              return n;
            var a = /* @__PURE__ */ Object.create(null);
            if (i.r(a), Object.defineProperty(a, "default", { enumerable: !0, value: n }), 2 & r && typeof n != "string")
              for (var l in n)
                i.d(a, l, function(c) {
                  return n[c];
                }.bind(null, l));
            return a;
          }, i.n = function(n) {
            var r = n && n.__esModule ? function() {
              return n.default;
            } : function() {
              return n;
            };
            return i.d(r, "a", r), r;
          }, i.o = function(n, r) {
            return Object.prototype.hasOwnProperty.call(n, r);
          }, i.p = "", i(i.s = 0);
        }([function(t, o, i) {
          t.exports = i(1);
        }, function(t, o, i) {
          i.r(o), i.d(o, "default", function() {
            return n;
          });
          class n {
            constructor() {
              this.nodes = { wrapper: null, content: null }, this.showed = !1, this.offsetTop = 10, this.offsetLeft = 10, this.offsetRight = 10, this.hidingDelay = 0, this.handleWindowScroll = () => {
                this.showed && this.hide(!0);
              }, this.loadStyles(), this.prepare(), window.addEventListener("scroll", this.handleWindowScroll, { passive: !0 });
            }
            get CSS() {
              return { tooltip: "ct", tooltipContent: "ct__content", tooltipShown: "ct--shown", placement: { left: "ct--left", bottom: "ct--bottom", right: "ct--right", top: "ct--top" } };
            }
            show(a, l, c) {
              this.nodes.wrapper || this.prepare(), this.hidingTimeout && clearTimeout(this.hidingTimeout);
              const u = Object.assign({ placement: "bottom", marginTop: 0, marginLeft: 0, marginRight: 0, marginBottom: 0, delay: 70, hidingDelay: 0 }, c);
              if (u.hidingDelay && (this.hidingDelay = u.hidingDelay), this.nodes.content.innerHTML = "", typeof l == "string")
                this.nodes.content.appendChild(document.createTextNode(l));
              else {
                if (!(l instanceof Node))
                  throw Error("[CodeX Tooltip] Wrong type of «content» passed. It should be an instance of Node or String. But " + typeof l + " given.");
                this.nodes.content.appendChild(l);
              }
              switch (this.nodes.wrapper.classList.remove(...Object.values(this.CSS.placement)), u.placement) {
                case "top":
                  this.placeTop(a, u);
                  break;
                case "left":
                  this.placeLeft(a, u);
                  break;
                case "right":
                  this.placeRight(a, u);
                  break;
                case "bottom":
                default:
                  this.placeBottom(a, u);
              }
              u && u.delay ? this.showingTimeout = setTimeout(() => {
                this.nodes.wrapper.classList.add(this.CSS.tooltipShown), this.showed = !0;
              }, u.delay) : (this.nodes.wrapper.classList.add(this.CSS.tooltipShown), this.showed = !0);
            }
            hide(a = !1) {
              if (this.hidingDelay && !a)
                return this.hidingTimeout && clearTimeout(this.hidingTimeout), void (this.hidingTimeout = setTimeout(() => {
                  this.hide(!0);
                }, this.hidingDelay));
              this.nodes.wrapper.classList.remove(this.CSS.tooltipShown), this.showed = !1, this.showingTimeout && clearTimeout(this.showingTimeout);
            }
            onHover(a, l, c) {
              a.addEventListener("mouseenter", () => {
                this.show(a, l, c);
              }), a.addEventListener("mouseleave", () => {
                this.hide();
              });
            }
            destroy() {
              this.nodes.wrapper.remove(), window.removeEventListener("scroll", this.handleWindowScroll);
            }
            prepare() {
              this.nodes.wrapper = this.make("div", this.CSS.tooltip), this.nodes.content = this.make("div", this.CSS.tooltipContent), this.append(this.nodes.wrapper, this.nodes.content), this.append(document.body, this.nodes.wrapper);
            }
            loadStyles() {
              const a = "codex-tooltips-style";
              if (document.getElementById(a))
                return;
              const l = i(2), c = this.make("style", null, { textContent: l.toString(), id: a });
              this.prepend(document.head, c);
            }
            placeBottom(a, l) {
              const c = a.getBoundingClientRect(), u = c.left + a.clientWidth / 2 - this.nodes.wrapper.offsetWidth / 2, h = c.bottom + window.pageYOffset + this.offsetTop + l.marginTop;
              this.applyPlacement("bottom", u, h);
            }
            placeTop(a, l) {
              const c = a.getBoundingClientRect(), u = c.left + a.clientWidth / 2 - this.nodes.wrapper.offsetWidth / 2, h = c.top + window.pageYOffset - this.nodes.wrapper.clientHeight - this.offsetTop;
              this.applyPlacement("top", u, h);
            }
            placeLeft(a, l) {
              const c = a.getBoundingClientRect(), u = c.left - this.nodes.wrapper.offsetWidth - this.offsetLeft - l.marginLeft, h = c.top + window.pageYOffset + a.clientHeight / 2 - this.nodes.wrapper.offsetHeight / 2;
              this.applyPlacement("left", u, h);
            }
            placeRight(a, l) {
              const c = a.getBoundingClientRect(), u = c.right + this.offsetRight + l.marginRight, h = c.top + window.pageYOffset + a.clientHeight / 2 - this.nodes.wrapper.offsetHeight / 2;
              this.applyPlacement("right", u, h);
            }
            applyPlacement(a, l, c) {
              this.nodes.wrapper.classList.add(this.CSS.placement[a]), this.nodes.wrapper.style.left = l + "px", this.nodes.wrapper.style.top = c + "px";
            }
            make(a, l = null, c = {}) {
              const u = document.createElement(a);
              Array.isArray(l) ? u.classList.add(...l) : l && u.classList.add(l);
              for (const h in c)
                c.hasOwnProperty(h) && (u[h] = c[h]);
              return u;
            }
            append(a, l) {
              Array.isArray(l) ? l.forEach((c) => a.appendChild(c)) : a.appendChild(l);
            }
            prepend(a, l) {
              Array.isArray(l) ? (l = l.reverse()).forEach((c) => a.prepend(c)) : a.prepend(l);
            }
          }
        }, function(t, o) {
          t.exports = `.ct{z-index:999;opacity:0;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none;-webkit-transition:opacity 50ms ease-in,-webkit-transform 70ms cubic-bezier(.215,.61,.355,1);transition:opacity 50ms ease-in,-webkit-transform 70ms cubic-bezier(.215,.61,.355,1);transition:opacity 50ms ease-in,transform 70ms cubic-bezier(.215,.61,.355,1);transition:opacity 50ms ease-in,transform 70ms cubic-bezier(.215,.61,.355,1),-webkit-transform 70ms cubic-bezier(.215,.61,.355,1);will-change:opacity,top,left;-webkit-box-shadow:0 8px 12px 0 rgba(29,32,43,.17),0 4px 5px -3px rgba(5,6,12,.49);box-shadow:0 8px 12px 0 rgba(29,32,43,.17),0 4px 5px -3px rgba(5,6,12,.49);border-radius:9px}.ct,.ct:before{position:absolute;top:0;left:0}.ct:before{content:"";bottom:0;right:0;background-color:#1d202b;z-index:-1;border-radius:4px}@supports(-webkit-mask-box-image:url("")){.ct:before{border-radius:0;-webkit-mask-box-image:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M10.71 0h2.58c3.02 0 4.64.42 6.1 1.2a8.18 8.18 0 013.4 3.4C23.6 6.07 24 7.7 24 10.71v2.58c0 3.02-.42 4.64-1.2 6.1a8.18 8.18 0 01-3.4 3.4c-1.47.8-3.1 1.21-6.11 1.21H10.7c-3.02 0-4.64-.42-6.1-1.2a8.18 8.18 0 01-3.4-3.4C.4 17.93 0 16.3 0 13.29V10.7c0-3.02.42-4.64 1.2-6.1a8.18 8.18 0 013.4-3.4C6.07.4 7.7 0 10.71 0z"/></svg>') 48% 41% 37.9% 53.3%}}@media (--mobile){.ct{display:none}}.ct__content{padding:6px 10px;color:#cdd1e0;font-size:12px;text-align:center;letter-spacing:.02em;line-height:1em}.ct:after{content:"";width:8px;height:8px;position:absolute;background-color:#1d202b;z-index:-1}.ct--bottom{-webkit-transform:translateY(5px);transform:translateY(5px)}.ct--bottom:after{top:-3px;left:50%;-webkit-transform:translateX(-50%) rotate(-45deg);transform:translateX(-50%) rotate(-45deg)}.ct--top{-webkit-transform:translateY(-5px);transform:translateY(-5px)}.ct--top:after{top:auto;bottom:-3px;left:50%;-webkit-transform:translateX(-50%) rotate(-45deg);transform:translateX(-50%) rotate(-45deg)}.ct--left{-webkit-transform:translateX(-5px);transform:translateX(-5px)}.ct--left:after{top:50%;left:auto;right:0;-webkit-transform:translate(41.6%,-50%) rotate(-45deg);transform:translate(41.6%,-50%) rotate(-45deg)}.ct--right{-webkit-transform:translateX(5px);transform:translateX(5px)}.ct--right:after{top:50%;left:0;-webkit-transform:translate(-41.6%,-50%) rotate(-45deg);transform:translate(-41.6%,-50%) rotate(-45deg)}.ct--shown{opacity:1;-webkit-transform:none;transform:none}`;
        }]).default;
      });
    })(yo);
    const Eo = /* @__PURE__ */ xe(Ae);
    class He {
      constructor() {
        this.lib = new Eo();
      }
      /**
       * Release the library
       */
      destroy() {
        this.lib.destroy();
      }
      /**
       * Shows tooltip on element with passed HTML content
       *
       * @param {HTMLElement} element - any HTML element in DOM
       * @param content - tooltip's content
       * @param options - showing settings
       */
      show(e, t, o) {
        this.lib.show(e, t, o);
      }
      /**
       * Hides tooltip
       *
       * @param skipHidingDelay — pass true to immediately hide the tooltip
       */
      hide(e = !1) {
        this.lib.hide(e);
      }
      /**
       * Binds 'mouseenter' and 'mouseleave' events that shows/hides the Tooltip
       *
       * @param {HTMLElement} element - any HTML element in DOM
       * @param content - tooltip's content
       * @param options - showing settings
       */
      onHover(e, t, o) {
        this.lib.onHover(e, t, o);
      }
    }
    class Bo extends C {
      /**
       * @class
       * @param moduleConfiguration - Module Configuration
       * @param moduleConfiguration.config - Editor's config
       * @param moduleConfiguration.eventsDispatcher - Editor's event dispatcher
       */
      constructor({ config: e, eventsDispatcher: t }) {
        super({
          config: e,
          eventsDispatcher: t
        }), this.tooltip = new He();
      }
      /**
       * Destroy Module
       */
      destroy() {
        this.tooltip.destroy();
      }
      /**
       * Available methods
       */
      get methods() {
        return {
          show: (e, t, o) => this.show(e, t, o),
          hide: () => this.hide(),
          onHover: (e, t, o) => this.onHover(e, t, o)
        };
      }
      /**
       * Method show tooltip on element with passed HTML content
       *
       * @param {HTMLElement} element - element on which tooltip should be shown
       * @param {TooltipContent} content - tooltip content
       * @param {TooltipOptions} options - tooltip options
       */
      show(e, t, o) {
        this.tooltip.show(e, t, o);
      }
      /**
       * Method hides tooltip on HTML page
       */
      hide() {
        this.tooltip.hide();
      }
      /**
       * Decorator for showing Tooltip by mouseenter/mouseleave
       *
       * @param {HTMLElement} element - element on which tooltip should be shown
       * @param {TooltipContent} content - tooltip content
       * @param {TooltipOptions} options - tooltip options
       */
      onHover(e, t, o) {
        this.tooltip.onHover(e, t, o);
      }
    }
    class To extends C {
      /**
       * Available methods / getters
       */
      get methods() {
        return {
          nodes: this.editorNodes
          /**
           * There can be added some UI methods, like toggleThinMode() etc
           */
        };
      }
      /**
       * Exported classes
       */
      get editorNodes() {
        return {
          /**
           * Top-level editor instance wrapper
           */
          wrapper: this.Editor.UI.nodes.wrapper,
          /**
           * Element that holds all the Blocks
           */
          redactor: this.Editor.UI.nodes.redactor
        };
      }
    }
    function pt(s, e) {
      const t = {};
      return Object.entries(s).forEach(([o, i]) => {
        if (z(i)) {
          const n = e ? `${e}.${o}` : o;
          Object.values(i).every((a) => J(a)) ? t[o] = n : t[o] = pt(i, n);
          return;
        }
        t[o] = i;
      }), t;
    }
    const X = pt(at);
    function Co(s, e) {
      const t = {};
      return Object.keys(s).forEach((o) => {
        const i = e[o];
        i !== void 0 ? t[i] = s[o] : t[o] = s[o];
      }), t;
    }
    const So = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9 12L9 7.1C9 7.04477 9.04477 7 9.1 7H10.4C11.5 7 14 7.1 14 9.5C14 9.5 14 12 11 12M9 12V16.8C9 16.9105 9.08954 17 9.2 17H12.5C14 17 15 16 15 14.5C15 11.7046 11 12 11 12M9 12H11"/></svg>', ft = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M7 10L11.8586 14.8586C11.9367 14.9367 12.0633 14.9367 12.1414 14.8586L17 10"/></svg>', Io = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M7 15L11.8586 10.1414C11.9367 10.0633 12.0633 10.0633 12.1414 10.1414L17 15"/></svg>', Mo = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M8 8L12 12M12 12L16 16M12 12L16 8M12 12L8 16"/></svg>', Lo = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/></svg>', Oo = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M13.34 10C12.4223 12.7337 11 17 11 17"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M14.21 7H14.2"/></svg>', Qe = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M7.69998 12.6L7.67896 12.62C6.53993 13.7048 6.52012 15.5155 7.63516 16.625V16.625C8.72293 17.7073 10.4799 17.7102 11.5712 16.6314L13.0263 15.193C14.0703 14.1609 14.2141 12.525 13.3662 11.3266L13.22 11.12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16.22 11.12L16.3564 10.9805C17.2895 10.0265 17.3478 8.5207 16.4914 7.49733V7.49733C15.5691 6.39509 13.9269 6.25143 12.8271 7.17675L11.3901 8.38588C10.0935 9.47674 9.95706 11.4241 11.0888 12.6852L11.12 12.72"/></svg>', Ao = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M9.40999 7.29999H9.4"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M14.6 7.29999H14.59"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M9.30999 12H9.3"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M14.6 12H14.59"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M9.40999 16.7H9.4"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2.6" d="M14.6 16.7H14.59"/></svg>', _o = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 7V12M12 17V12M17 12H12M12 12H7"/></svg>', No = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" stroke-width="2"/><line x1="15.4142" x2="19" y1="15" y2="18.5858" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>', Ro = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M15.7795 11.5C15.7795 11.5 16.053 11.1962 16.5497 10.6722C17.4442 9.72856 17.4701 8.2475 16.5781 7.30145V7.30145C15.6482 6.31522 14.0873 6.29227 13.1288 7.25073L11.8796 8.49999"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M8.24517 12.3883C8.24517 12.3883 7.97171 12.6922 7.47504 13.2161C6.58051 14.1598 6.55467 15.6408 7.44666 16.5869V16.5869C8.37653 17.5731 9.93744 17.5961 10.8959 16.6376L12.1452 15.3883"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M17.7802 15.1032L16.597 14.9422C16.0109 14.8624 15.4841 15.3059 15.4627 15.8969L15.4199 17.0818"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6.39064 9.03238L7.58432 9.06668C8.17551 9.08366 8.6522 8.58665 8.61056 7.99669L8.5271 6.81397"/><line x1="12.1142" x2="11.7" y1="12.2" y2="11.7858" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>', Do = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><rect width="14" height="14" x="5" y="5" stroke="currentColor" stroke-width="2" rx="4"/><line x1="12" x2="12" y1="9" y2="12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 15.02V15.01"/></svg>';
    class P {
      /**
       * Constructs popover item instance
       *
       * @param params - popover item construction params
       */
      constructor(e) {
        this.nodes = {
          root: null,
          icon: null
        }, this.confirmationState = null, this.removeSpecialFocusBehavior = () => {
          this.nodes.root.classList.remove(P.CSS.noFocus);
        }, this.removeSpecialHoverBehavior = () => {
          this.nodes.root.classList.remove(P.CSS.noHover);
        }, this.onErrorAnimationEnd = () => {
          this.nodes.icon.classList.remove(P.CSS.wobbleAnimation), this.nodes.icon.removeEventListener("animationend", this.onErrorAnimationEnd);
        }, this.params = e, this.nodes.root = this.make(e);
      }
      /**
       * True if item is disabled and hence not clickable
       */
      get isDisabled() {
        return this.params.isDisabled;
      }
      /**
       * Exposes popover item toggle parameter
       */
      get toggle() {
        return this.params.toggle;
      }
      /**
       * Item title
       */
      get title() {
        return this.params.title;
      }
      /**
       * True if popover should close once item is activated
       */
      get closeOnActivate() {
        return this.params.closeOnActivate;
      }
      /**
       * True if confirmation state is enabled for popover item
       */
      get isConfirmationStateEnabled() {
        return this.confirmationState !== null;
      }
      /**
       * True if item is focused in keyboard navigation process
       */
      get isFocused() {
        return this.nodes.root.classList.contains(P.CSS.focused);
      }
      /**
       * Popover item CSS classes
       */
      static get CSS() {
        return {
          container: "ce-popover-item",
          title: "ce-popover-item__title",
          secondaryTitle: "ce-popover-item__secondary-title",
          icon: "ce-popover-item__icon",
          active: "ce-popover-item--active",
          disabled: "ce-popover-item--disabled",
          focused: "ce-popover-item--focused",
          hidden: "ce-popover-item--hidden",
          confirmationState: "ce-popover-item--confirmation",
          noHover: "ce-popover-item--no-hover",
          noFocus: "ce-popover-item--no-focus",
          wobbleAnimation: "wobble"
        };
      }
      /**
       * Returns popover item root element
       */
      getElement() {
        return this.nodes.root;
      }
      /**
       * Called on popover item click
       */
      handleClick() {
        if (this.isConfirmationStateEnabled) {
          this.activateOrEnableConfirmationMode(this.confirmationState);
          return;
        }
        this.activateOrEnableConfirmationMode(this.params);
      }
      /**
       * Toggles item active state
       *
       * @param isActive - true if item should strictly should become active
       */
      toggleActive(e) {
        this.nodes.root.classList.toggle(P.CSS.active, e);
      }
      /**
       * Toggles item hidden state
       *
       * @param isHidden - true if item should be hidden
       */
      toggleHidden(e) {
        this.nodes.root.classList.toggle(P.CSS.hidden, e);
      }
      /**
       * Resets popover item to its original state
       */
      reset() {
        this.isConfirmationStateEnabled && this.disableConfirmationMode();
      }
      /**
       * Method called once item becomes focused during keyboard navigation
       */
      onFocus() {
        this.disableSpecialHoverAndFocusBehavior();
      }
      /**
       * Constructs HTML element corresponding to popover item params
       *
       * @param params - item construction params
       */
      make(e) {
        const t = d.make("div", P.CSS.container);
        return e.name && (t.dataset.itemName = e.name), this.nodes.icon = d.make("div", P.CSS.icon, {
          innerHTML: e.icon || Lo
        }), t.appendChild(this.nodes.icon), t.appendChild(d.make("div", P.CSS.title, {
          innerHTML: e.title || ""
        })), e.secondaryLabel && t.appendChild(d.make("div", P.CSS.secondaryTitle, {
          textContent: e.secondaryLabel
        })), e.isActive && t.classList.add(P.CSS.active), e.isDisabled && t.classList.add(P.CSS.disabled), t;
      }
      /**
       * Activates confirmation mode for the item.
       *
       * @param newState - new popover item params that should be applied
       */
      enableConfirmationMode(e) {
        const t = {
          ...this.params,
          ...e,
          confirmation: e.confirmation
        }, o = this.make(t);
        this.nodes.root.innerHTML = o.innerHTML, this.nodes.root.classList.add(P.CSS.confirmationState), this.confirmationState = e, this.enableSpecialHoverAndFocusBehavior();
      }
      /**
       * Returns item to its original state
       */
      disableConfirmationMode() {
        const e = this.make(this.params);
        this.nodes.root.innerHTML = e.innerHTML, this.nodes.root.classList.remove(P.CSS.confirmationState), this.confirmationState = null, this.disableSpecialHoverAndFocusBehavior();
      }
      /**
       * Enables special focus and hover behavior for item in confirmation state.
       * This is needed to prevent item from being highlighted as hovered/focused just after click.
       */
      enableSpecialHoverAndFocusBehavior() {
        this.nodes.root.classList.add(P.CSS.noHover), this.nodes.root.classList.add(P.CSS.noFocus), this.nodes.root.addEventListener("mouseleave", this.removeSpecialHoverBehavior, { once: !0 });
      }
      /**
       * Disables special focus and hover behavior
       */
      disableSpecialHoverAndFocusBehavior() {
        this.removeSpecialFocusBehavior(), this.removeSpecialHoverBehavior(), this.nodes.root.removeEventListener("mouseleave", this.removeSpecialHoverBehavior);
      }
      /**
       * Executes item's onActivate callback if the item has no confirmation configured
       *
       * @param item - item to activate or bring to confirmation mode
       */
      activateOrEnableConfirmationMode(e) {
        if (e.confirmation === void 0)
          try {
            e.onActivate(e), this.disableConfirmationMode();
          } catch {
            this.animateError();
          }
        else
          this.enableConfirmationMode(e.confirmation);
      }
      /**
       * Animates item which symbolizes that error occured while executing 'onActivate()' callback
       */
      animateError() {
        this.nodes.icon.classList.contains(P.CSS.wobbleAnimation) || (this.nodes.icon.classList.add(P.CSS.wobbleAnimation), this.nodes.icon.addEventListener("animationend", this.onErrorAnimationEnd));
      }
    }
    const he = class {
      /**
       * @param {HTMLElement[]} nodeList — the list of iterable HTML-items
       * @param {string} focusedCssClass - user-provided CSS-class that will be set in flipping process
       */
      constructor(s, e) {
        this.cursor = -1, this.items = [], this.items = s || [], this.focusedCssClass = e;
      }
      /**
       * Returns Focused button Node
       *
       * @returns {HTMLElement}
       */
      get currentItem() {
        return this.cursor === -1 ? null : this.items[this.cursor];
      }
      /**
       * Sets cursor to specified position
       *
       * @param cursorPosition - new cursor position
       */
      setCursor(s) {
        s < this.items.length && s >= -1 && (this.dropCursor(), this.cursor = s, this.items[this.cursor].classList.add(this.focusedCssClass));
      }
      /**
       * Sets items. Can be used when iterable items changed dynamically
       *
       * @param {HTMLElement[]} nodeList - nodes to iterate
       */
      setItems(s) {
        this.items = s;
      }
      /**
       * Sets cursor next to the current
       */
      next() {
        this.cursor = this.leafNodesAndReturnIndex(he.directions.RIGHT);
      }
      /**
       * Sets cursor before current
       */
      previous() {
        this.cursor = this.leafNodesAndReturnIndex(he.directions.LEFT);
      }
      /**
       * Sets cursor to the default position and removes CSS-class from previously focused item
       */
      dropCursor() {
        this.cursor !== -1 && (this.items[this.cursor].classList.remove(this.focusedCssClass), this.cursor = -1);
      }
      /**
       * Leafs nodes inside the target list from active element
       *
       * @param {string} direction - leaf direction. Can be 'left' or 'right'
       * @returns {number} index of focused node
       */
      leafNodesAndReturnIndex(s) {
        if (this.items.length === 0)
          return this.cursor;
        let e = this.cursor;
        return e === -1 ? e = s === he.directions.RIGHT ? -1 : 0 : this.items[e].classList.remove(this.focusedCssClass), s === he.directions.RIGHT ? e = (e + 1) % this.items.length : e = (this.items.length + e - 1) % this.items.length, d.canSetCaret(this.items[e]) && re(() => m.setCursor(this.items[e]), 50)(), this.items[e].classList.add(this.focusedCssClass), e;
      }
    };
    let ne = he;
    ne.directions = {
      RIGHT: "right",
      LEFT: "left"
    };
    class G {
      /**
       * @param {FlipperOptions} options - different constructing settings
       */
      constructor(e) {
        this.iterator = null, this.activated = !1, this.flipCallbacks = [], this.onKeyDown = (t) => {
          if (this.isEventReadyForHandling(t))
            switch (G.usedKeys.includes(t.keyCode) && t.preventDefault(), t.keyCode) {
              case B.TAB:
                this.handleTabPress(t);
                break;
              case B.LEFT:
              case B.UP:
                this.flipLeft();
                break;
              case B.RIGHT:
              case B.DOWN:
                this.flipRight();
                break;
              case B.ENTER:
                this.handleEnterPress(t);
                break;
            }
        }, this.iterator = new ne(e.items, e.focusedItemClass), this.activateCallback = e.activateCallback, this.allowedKeys = e.allowedKeys || G.usedKeys;
      }
      /**
       * True if flipper is currently activated
       */
      get isActivated() {
        return this.activated;
      }
      /**
       * Array of keys (codes) that is handled by Flipper
       * Used to:
       *  - preventDefault only for this keys, not all keydowns (@see constructor)
       *  - to skip external behaviours only for these keys, when filler is activated (@see BlockEvents@arrowRightAndDown)
       */
      static get usedKeys() {
        return [
          B.TAB,
          B.LEFT,
          B.RIGHT,
          B.ENTER,
          B.UP,
          B.DOWN
        ];
      }
      /**
       * Active tab/arrows handling by flipper
       *
       * @param items - Some modules (like, InlineToolbar, BlockSettings) might refresh buttons dynamically
       * @param cursorPosition - index of the item that should be focused once flipper is activated
       */
      activate(e, t) {
        this.activated = !0, e && this.iterator.setItems(e), t !== void 0 && this.iterator.setCursor(t), document.addEventListener("keydown", this.onKeyDown, !0);
      }
      /**
       * Disable tab/arrows handling by flipper
       */
      deactivate() {
        this.activated = !1, this.dropCursor(), document.removeEventListener("keydown", this.onKeyDown);
      }
      /**
       * Focus first item
       */
      focusFirst() {
        this.dropCursor(), this.flipRight();
      }
      /**
       * Focuses previous flipper iterator item
       */
      flipLeft() {
        this.iterator.previous(), this.flipCallback();
      }
      /**
       * Focuses next flipper iterator item
       */
      flipRight() {
        this.iterator.next(), this.flipCallback();
      }
      /**
       * Return true if some button is focused
       */
      hasFocus() {
        return !!this.iterator.currentItem;
      }
      /**
       * Registeres function that should be executed on each navigation action
       *
       * @param cb - function to execute
       */
      onFlip(e) {
        this.flipCallbacks.push(e);
      }
      /**
       * Unregisteres function that is executed on each navigation action
       *
       * @param cb - function to stop executing
       */
      removeOnFlip(e) {
        this.flipCallbacks = this.flipCallbacks.filter((t) => t !== e);
      }
      /**
       * Drops flipper's iterator cursor
       *
       * @see DomIterator#dropCursor
       */
      dropCursor() {
        this.iterator.dropCursor();
      }
      /**
       * This function is fired before handling flipper keycodes
       * The result of this function defines if it is need to be handled or not
       *
       * @param {KeyboardEvent} event - keydown keyboard event
       * @returns {boolean}
       */
      isEventReadyForHandling(e) {
        return this.activated && this.allowedKeys.includes(e.keyCode);
      }
      /**
       * When flipper is activated tab press will leaf the items
       *
       * @param {KeyboardEvent} event - tab keydown event
       */
      handleTabPress(e) {
        switch (e.shiftKey ? ne.directions.LEFT : ne.directions.RIGHT) {
          case ne.directions.RIGHT:
            this.flipRight();
            break;
          case ne.directions.LEFT:
            this.flipLeft();
            break;
        }
      }
      /**
       * Enter press will click current item if flipper is activated
       *
       * @param {KeyboardEvent} event - enter keydown event
       */
      handleEnterPress(e) {
        this.activated && (this.iterator.currentItem && (e.stopPropagation(), e.preventDefault(), this.iterator.currentItem.click()), D(this.activateCallback) && this.activateCallback(this.iterator.currentItem));
      }
      /**
       * Fired after flipping in any direction
       */
      flipCallback() {
        this.iterator.currentItem && this.iterator.currentItem.scrollIntoViewIfNeeded(), this.flipCallbacks.forEach((e) => e());
      }
    }
    class pe {
      /**
       * Styles
       */
      static get CSS() {
        return {
          wrapper: "cdx-search-field",
          icon: "cdx-search-field__icon",
          input: "cdx-search-field__input"
        };
      }
      /**
       * @param options - available config
       * @param options.items - searchable items list
       * @param options.onSearch - search callback
       * @param options.placeholder - input placeholder
       */
      constructor({ items: e, onSearch: t, placeholder: o }) {
        this.listeners = new De(), this.items = e, this.onSearch = t, this.render(o);
      }
      /**
       * Returns search field element
       */
      getElement() {
        return this.wrapper;
      }
      /**
       * Sets focus to the input
       */
      focus() {
        this.input.focus();
      }
      /**
       * Clears search query and results
       */
      clear() {
        this.input.value = "", this.searchQuery = "", this.onSearch("", this.foundItems);
      }
      /**
       * Clears memory
       */
      destroy() {
        this.listeners.removeAll();
      }
      /**
       * Creates the search field
       *
       * @param placeholder - input placeholder
       */
      render(e) {
        this.wrapper = d.make("div", pe.CSS.wrapper);
        const t = d.make("div", pe.CSS.icon, {
          innerHTML: No
        });
        this.input = d.make("input", pe.CSS.input, {
          placeholder: e
        }), this.wrapper.appendChild(t), this.wrapper.appendChild(this.input), this.listeners.on(this.input, "input", () => {
          this.searchQuery = this.input.value, this.onSearch(this.searchQuery, this.foundItems);
        });
      }
      /**
       * Returns list of found items for the current search query
       */
      get foundItems() {
        return this.items.filter((e) => this.checkItem(e));
      }
      /**
       * Contains logic for checking whether passed item conforms the search query
       *
       * @param item - item to be checked
       */
      checkItem(e) {
        var i;
        const t = ((i = e.title) == null ? void 0 : i.toLowerCase()) || "", o = this.searchQuery.toLowerCase();
        return t.includes(o);
      }
    }
    const ue = class {
      /**
       * Locks body element scroll
       */
      lock() {
        Ge ? this.lockHard() : document.body.classList.add(ue.CSS.scrollLocked);
      }
      /**
       * Unlocks body element scroll
       */
      unlock() {
        Ge ? this.unlockHard() : document.body.classList.remove(ue.CSS.scrollLocked);
      }
      /**
       * Locks scroll in a hard way (via setting fixed position to body element)
       */
      lockHard() {
        this.scrollPosition = window.pageYOffset, document.documentElement.style.setProperty(
          "--window-scroll-offset",
          `${this.scrollPosition}px`
        ), document.body.classList.add(ue.CSS.scrollLockedHard);
      }
      /**
       * Unlocks hard scroll lock
       */
      unlockHard() {
        document.body.classList.remove(ue.CSS.scrollLockedHard), this.scrollPosition !== null && window.scrollTo(0, this.scrollPosition), this.scrollPosition = null;
      }
    };
    let gt = ue;
    gt.CSS = {
      scrollLocked: "ce-scroll-locked",
      scrollLockedHard: "ce-scroll-locked--hard"
    };
    var Po = Object.defineProperty, Fo = Object.getOwnPropertyDescriptor, Ho = (s, e, t, o) => {
      for (var i = o > 1 ? void 0 : o ? Fo(e, t) : e, n = s.length - 1, r; n >= 0; n--)
        (r = s[n]) && (i = (o ? r(e, t, i) : r(i)) || i);
      return o && i && Po(e, t, i), i;
    }, ge = /* @__PURE__ */ ((s) => (s.Close = "close", s))(ge || {});
    const j = class extends we {
      /**
       * Constructs the instance
       *
       * @param params - popover construction params
       */
      constructor(s) {
        super(), this.scopeElement = document.body, this.listeners = new De(), this.scrollLocker = new gt(), this.nodes = {
          wrapper: null,
          popover: null,
          nothingFoundMessage: null,
          customContent: null,
          items: null,
          overlay: null
        }, this.messages = {
          nothingFound: "Nothing found",
          search: "Search"
        }, this.onFlip = () => {
          this.items.find((t) => t.isFocused).onFocus();
        }, this.items = s.items.map((e) => new P(e)), s.scopeElement !== void 0 && (this.scopeElement = s.scopeElement), s.messages && (this.messages = {
          ...this.messages,
          ...s.messages
        }), s.customContentFlippableItems && (this.customContentFlippableItems = s.customContentFlippableItems), this.make(), s.customContent && this.addCustomContent(s.customContent), s.searchable && this.addSearch(), this.initializeFlipper();
      }
      /**
       * Popover CSS classes
       */
      static get CSS() {
        return {
          popover: "ce-popover",
          popoverOpenTop: "ce-popover--open-top",
          popoverOpened: "ce-popover--opened",
          search: "ce-popover__search",
          nothingFoundMessage: "ce-popover__nothing-found-message",
          nothingFoundMessageDisplayed: "ce-popover__nothing-found-message--displayed",
          customContent: "ce-popover__custom-content",
          customContentHidden: "ce-popover__custom-content--hidden",
          items: "ce-popover__items",
          overlay: "ce-popover__overlay",
          overlayHidden: "ce-popover__overlay--hidden"
        };
      }
      /**
       * Returns HTML element corresponding to the popover
       */
      getElement() {
        return this.nodes.wrapper;
      }
      /**
       * Returns true if some item inside popover is focused
       */
      hasFocus() {
        return this.flipper.hasFocus();
      }
      /**
       * Open popover
       */
      show() {
        this.shouldOpenBottom || (this.nodes.popover.style.setProperty("--popover-height", this.height + "px"), this.nodes.popover.classList.add(j.CSS.popoverOpenTop)), this.nodes.overlay.classList.remove(j.CSS.overlayHidden), this.nodes.popover.classList.add(j.CSS.popoverOpened), this.flipper.activate(this.flippableElements), this.search !== void 0 && setTimeout(() => {
          this.search.focus();
        }, 100), te() && this.scrollLocker.lock();
      }
      /**
       * Closes popover
       */
      hide() {
        this.nodes.popover.classList.remove(j.CSS.popoverOpened), this.nodes.popover.classList.remove(j.CSS.popoverOpenTop), this.nodes.overlay.classList.add(j.CSS.overlayHidden), this.flipper.deactivate(), this.items.forEach((s) => s.reset()), this.search !== void 0 && this.search.clear(), te() && this.scrollLocker.unlock(), this.emit(
          "close"
          /* Close */
        );
      }
      /**
       * Clears memory
       */
      destroy() {
        this.flipper.deactivate(), this.listeners.removeAll(), te() && this.scrollLocker.unlock();
      }
      /**
       * Constructs HTML element corresponding to popover
       */
      make() {
        this.nodes.popover = d.make("div", [j.CSS.popover]), this.nodes.nothingFoundMessage = d.make("div", [j.CSS.nothingFoundMessage], {
          textContent: this.messages.nothingFound
        }), this.nodes.popover.appendChild(this.nodes.nothingFoundMessage), this.nodes.items = d.make("div", [j.CSS.items]), this.items.forEach((s) => {
          this.nodes.items.appendChild(s.getElement());
        }), this.nodes.popover.appendChild(this.nodes.items), this.listeners.on(this.nodes.popover, "click", (s) => {
          const e = this.getTargetItem(s);
          e !== void 0 && this.handleItemClick(e);
        }), this.nodes.wrapper = d.make("div"), this.nodes.overlay = d.make("div", [j.CSS.overlay, j.CSS.overlayHidden]), this.listeners.on(this.nodes.overlay, "click", () => {
          this.hide();
        }), this.nodes.wrapper.appendChild(this.nodes.overlay), this.nodes.wrapper.appendChild(this.nodes.popover);
      }
      /**
       * Adds search to the popover
       */
      addSearch() {
        this.search = new pe({
          items: this.items,
          placeholder: this.messages.search,
          onSearch: (e, t) => {
            this.items.forEach((i) => {
              const n = !t.includes(i);
              i.toggleHidden(n);
            }), this.toggleNothingFoundMessage(t.length === 0), this.toggleCustomContent(e !== "");
            const o = e === "" ? this.flippableElements : t.map((i) => i.getElement());
            this.flipper.isActivated && (this.flipper.deactivate(), this.flipper.activate(o));
          }
        });
        const s = this.search.getElement();
        s.classList.add(j.CSS.search), this.nodes.popover.insertBefore(s, this.nodes.popover.firstChild);
      }
      /**
       * Adds custom html content to the popover
       *
       * @param content - html content to append
       */
      addCustomContent(s) {
        this.nodes.customContent = s, this.nodes.customContent.classList.add(j.CSS.customContent), this.nodes.popover.insertBefore(s, this.nodes.popover.firstChild);
      }
      /**
       * Retrieves popover item that is the target of the specified event
       *
       * @param event - event to retrieve popover item from
       */
      getTargetItem(s) {
        return this.items.find((e) => s.composedPath().includes(e.getElement()));
      }
      /**
       * Handles item clicks
       *
       * @param item - item to handle click of
       */
      handleItemClick(s) {
        s.isDisabled || (this.items.filter((e) => e !== s).forEach((e) => e.reset()), s.handleClick(), this.toggleItemActivenessIfNeeded(s), s.closeOnActivate && this.hide());
      }
      /**
       * Creates Flipper instance which allows to navigate between popover items via keyboard
       */
      initializeFlipper() {
        this.flipper = new G({
          items: this.flippableElements,
          focusedItemClass: P.CSS.focused,
          allowedKeys: [
            B.TAB,
            B.UP,
            B.DOWN,
            B.ENTER
          ]
        }), this.flipper.onFlip(this.onFlip);
      }
      /**
       * Returns list of elements available for keyboard navigation.
       * Contains both usual popover items elements and custom html content.
       */
      get flippableElements() {
        const s = this.items.map((t) => t.getElement());
        return (this.customContentFlippableItems || []).concat(s);
      }
      get height() {
        let s = 0;
        if (this.nodes.popover === null)
          return s;
        const e = this.nodes.popover.cloneNode(!0);
        return e.style.visibility = "hidden", e.style.position = "absolute", e.style.top = "-1000px", e.classList.add(j.CSS.popoverOpened), document.body.appendChild(e), s = e.offsetHeight, e.remove(), s;
      }
      /**
       * Checks if popover should be opened bottom.
       * It should happen when there is enough space below or not enough space above
       */
      get shouldOpenBottom() {
        const s = this.nodes.popover.getBoundingClientRect(), e = this.scopeElement.getBoundingClientRect(), t = this.height, o = s.top + t, i = s.top - t, n = Math.min(window.innerHeight, e.bottom);
        return i < e.top || o <= n;
      }
      /**
       * Toggles nothing found message visibility
       *
       * @param isDisplayed - true if the message should be displayed
       */
      toggleNothingFoundMessage(s) {
        this.nodes.nothingFoundMessage.classList.toggle(j.CSS.nothingFoundMessageDisplayed, s);
      }
      /**
       * Toggles custom content visibility
       *
       * @param isDisplayed - true if custom content should be displayed
       */
      toggleCustomContent(s) {
        var e;
        (e = this.nodes.customContent) == null || e.classList.toggle(j.CSS.customContentHidden, s);
      }
      /**
       * - Toggles item active state, if clicked popover item has property 'toggle' set to true.
       *
       * - Performs radiobutton-like behavior if the item has property 'toggle' set to string key.
       * (All the other items with the same key get inactive, and the item gets active)
       *
       * @param clickedItem - popover item that was clicked
       */
      toggleItemActivenessIfNeeded(s) {
        if (s.toggle === !0 && s.toggleActive(), typeof s.toggle == "string") {
          const e = this.items.filter((t) => t.toggle === s.toggle);
          if (e.length === 1) {
            s.toggleActive();
            return;
          }
          e.forEach((t) => {
            t.toggleActive(t === s);
          });
        }
      }
    };
    let je = j;
    Ho([
      ce
    ], je.prototype, "height", 1);
    class jo extends C {
      constructor() {
        super(...arguments), this.opened = !1, this.selection = new m(), this.onPopoverClose = () => {
          this.close();
        };
      }
      /**
       * Module Events
       *
       * @returns {{opened: string, closed: string}}
       */
      get events() {
        return {
          opened: "block-settings-opened",
          closed: "block-settings-closed"
        };
      }
      /**
       * Block Settings CSS
       */
      get CSS() {
        return {
          settings: "ce-settings"
        };
      }
      /**
       * Getter for inner popover's flipper instance
       *
       * @todo remove once BlockSettings becomes standalone non-module class
       */
      get flipper() {
        var e;
        return (e = this.popover) == null ? void 0 : e.flipper;
      }
      /**
       * Panel with block settings with 2 sections:
       *  - Tool's Settings
       *  - Default Settings [Move, Remove, etc]
       */
      make() {
        this.nodes.wrapper = d.make("div", [this.CSS.settings]);
      }
      /**
       * Destroys module
       */
      destroy() {
        this.removeAllNodes();
      }
      /**
       * Open Block Settings pane
       *
       * @param targetBlock - near which Block we should open BlockSettings
       */
      open(e = this.Editor.BlockManager.currentBlock) {
        this.opened = !0, this.selection.save(), e.selected = !0, this.Editor.BlockSelection.clearCache();
        const [t, o] = e.getTunes();
        this.eventsDispatcher.emit(this.events.opened), this.popover = new je({
          searchable: !0,
          items: t.map((i) => this.resolveTuneAliases(i)),
          customContent: o,
          customContentFlippableItems: this.getControls(o),
          scopeElement: this.Editor.API.methods.ui.nodes.redactor,
          messages: {
            nothingFound: $.ui(X.ui.popover, "Nothing found"),
            search: $.ui(X.ui.popover, "Filter")
          }
        }), this.popover.on(ge.Close, this.onPopoverClose), this.nodes.wrapper.append(this.popover.getElement()), this.popover.show();
      }
      /**
       * Returns root block settings element
       */
      getElement() {
        return this.nodes.wrapper;
      }
      /**
       * Close Block Settings pane
       */
      close() {
        this.opened = !1, m.isAtEditor || this.selection.restore(), this.selection.clearSaved(), !this.Editor.CrossBlockSelection.isCrossBlockSelectionStarted && this.Editor.BlockManager.currentBlock && (this.Editor.BlockManager.currentBlock.selected = !1), this.eventsDispatcher.emit(this.events.closed), this.popover && (this.popover.off(ge.Close, this.onPopoverClose), this.popover.destroy(), this.popover.getElement().remove(), this.popover = null);
      }
      /**
       * Returns list of buttons and inputs inside specified container
       *
       * @param container - container to query controls inside of
       */
      getControls(e) {
        const { StylesAPI: t } = this.Editor, o = e.querySelectorAll(
          `.${t.classes.settingsButton}, ${d.allInputsSelector}`
        );
        return Array.from(o);
      }
      /**
       * Resolves aliases in tunes menu items
       *
       * @param item - item with resolved aliases
       */
      resolveTuneAliases(e) {
        const t = Co(e, { label: "title" });
        return e.confirmation && (t.confirmation = this.resolveTuneAliases(e.confirmation)), t;
      }
    }
    class Y extends C {
      constructor() {
        super(...arguments), this.opened = !1, this.tools = [], this.flipper = null, this.togglingCallback = null;
      }
      /**
       * CSS getter
       */
      static get CSS() {
        return {
          conversionToolbarWrapper: "ce-conversion-toolbar",
          conversionToolbarShowed: "ce-conversion-toolbar--showed",
          conversionToolbarTools: "ce-conversion-toolbar__tools",
          conversionToolbarLabel: "ce-conversion-toolbar__label",
          conversionTool: "ce-conversion-tool",
          conversionToolHidden: "ce-conversion-tool--hidden",
          conversionToolIcon: "ce-conversion-tool__icon",
          conversionToolSecondaryLabel: "ce-conversion-tool__secondary-label",
          conversionToolFocused: "ce-conversion-tool--focused",
          conversionToolActive: "ce-conversion-tool--active"
        };
      }
      /**
       * Create UI of Conversion Toolbar
       */
      make() {
        this.nodes.wrapper = d.make("div", [
          Y.CSS.conversionToolbarWrapper,
          ...this.isRtl ? [this.Editor.UI.CSS.editorRtlFix] : []
        ]), this.nodes.tools = d.make("div", Y.CSS.conversionToolbarTools);
        const e = d.make("div", Y.CSS.conversionToolbarLabel, {
          textContent: $.ui(X.ui.inlineToolbar.converter, "Convert to")
        });
        return this.addTools(), this.enableFlipper(), d.append(this.nodes.wrapper, e), d.append(this.nodes.wrapper, this.nodes.tools), this.nodes.wrapper;
      }
      /**
       * Deactivates flipper and removes all nodes
       */
      destroy() {
        this.flipper && (this.flipper.deactivate(), this.flipper = null), this.removeAllNodes();
      }
      /**
       * Toggle conversion dropdown visibility
       *
       * @param {Function} [togglingCallback] — callback that will accept opening state
       */
      toggle(e) {
        this.opened ? this.close() : this.open(), D(e) && (this.togglingCallback = e);
      }
      /**
       * Shows Conversion Toolbar
       */
      open() {
        this.filterTools(), this.opened = !0, this.nodes.wrapper.classList.add(Y.CSS.conversionToolbarShowed), window.requestAnimationFrame(() => {
          this.flipper.activate(this.tools.map((e) => e.button).filter((e) => !e.classList.contains(Y.CSS.conversionToolHidden))), this.flipper.focusFirst(), D(this.togglingCallback) && this.togglingCallback(!0);
        });
      }
      /**
       * Closes Conversion Toolbar
       */
      close() {
        this.opened = !1, this.flipper.deactivate(), this.nodes.wrapper.classList.remove(Y.CSS.conversionToolbarShowed), D(this.togglingCallback) && this.togglingCallback(!1);
      }
      /**
       * Returns true if it has more than one tool available for convert in
       */
      hasTools() {
        return this.tools.length === 1 ? this.tools[0].name !== this.config.defaultBlock : !0;
      }
      /**
       * Replaces one Block with another
       * For that Tools must provide import/export methods
       *
       * @param {string} replacingToolName - name of Tool which replaces current
       * @param blockDataOverrides - If this conversion fired by the one of multiple Toolbox items, extend converted data with this item's "data" overrides
       */
      async replaceWithBlock(e, t) {
        const { BlockManager: o, BlockSelection: i, InlineToolbar: n, Caret: r } = this.Editor;
        o.convert(this.Editor.BlockManager.currentBlock, e, t), i.clearSelection(), this.close(), n.close(), window.requestAnimationFrame(() => {
          r.setToBlock(this.Editor.BlockManager.currentBlock, r.positions.END);
        });
      }
      /**
       * Iterates existing Tools and inserts to the ConversionToolbar
       * if tools have ability to import
       */
      addTools() {
        const e = this.Editor.Tools.blockTools;
        Array.from(e.entries()).forEach(([t, o]) => {
          var n;
          const i = o.conversionConfig;
          !i || !i.import || (n = o.toolbox) == null || n.forEach(
            (r) => this.addToolIfValid(t, r)
          );
        });
      }
      /**
       * Inserts a tool to the ConversionToolbar if the tool's toolbox config is valid
       *
       * @param name - tool's name
       * @param toolboxSettings - tool's single toolbox setting
       */
      addToolIfValid(e, t) {
        V(t) || !t.icon || this.addTool(e, t);
      }
      /**
       * Add tool to the Conversion Toolbar
       *
       * @param toolName - name of Tool to add
       * @param toolboxItem - tool's toolbox item data
       */
      addTool(e, t) {
        var r;
        const o = d.make("div", [Y.CSS.conversionTool]), i = d.make("div", [Y.CSS.conversionToolIcon]);
        o.dataset.tool = e, i.innerHTML = t.icon, d.append(o, i), d.append(o, d.text($.t(X.toolNames, t.title || ae(e))));
        const n = (r = this.Editor.Tools.blockTools.get(e)) == null ? void 0 : r.shortcut;
        if (n) {
          const a = d.make("span", Y.CSS.conversionToolSecondaryLabel, {
            innerText: Re(n)
          });
          d.append(o, a);
        }
        d.append(this.nodes.tools, o), this.tools.push({
          name: e,
          button: o,
          toolboxItem: t
        }), this.listeners.on(o, "click", async () => {
          await this.replaceWithBlock(e, t.data);
        });
      }
      /**
       * Hide current Tool and show others
       */
      async filterTools() {
        const { currentBlock: e } = this.Editor.BlockManager, t = await e.getActiveToolboxEntry();
        function o(i, n) {
          return i.icon === n.icon && i.title === n.title;
        }
        this.tools.forEach((i) => {
          let n = !1;
          if (t) {
            const r = o(t, i.toolboxItem);
            n = i.button.dataset.tool === e.name && r;
          }
          i.button.hidden = n, i.button.classList.toggle(Y.CSS.conversionToolHidden, n);
        });
      }
      /**
       * Prepare Flipper to be able to leaf tools by arrows/tab
       */
      enableFlipper() {
        this.flipper = new G({
          focusedItemClass: Y.CSS.conversionToolFocused
        });
      }
    }
    var _e = {}, zo = {
      get exports() {
        return _e;
      },
      set exports(s) {
        _e = s;
      }
    };
    /*!
     * Library for handling keyboard shortcuts
     * @copyright CodeX (https://codex.so)
     * @license MIT
     * @author CodeX (https://codex.so)
     * @version 1.2.0
     */
    (function(s, e) {
      (function(t, o) {
        s.exports = o();
      })(window, function() {
        return function(t) {
          var o = {};
          function i(n) {
            if (o[n])
              return o[n].exports;
            var r = o[n] = { i: n, l: !1, exports: {} };
            return t[n].call(r.exports, r, r.exports, i), r.l = !0, r.exports;
          }
          return i.m = t, i.c = o, i.d = function(n, r, a) {
            i.o(n, r) || Object.defineProperty(n, r, { enumerable: !0, get: a });
          }, i.r = function(n) {
            typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(n, "__esModule", { value: !0 });
          }, i.t = function(n, r) {
            if (1 & r && (n = i(n)), 8 & r || 4 & r && typeof n == "object" && n && n.__esModule)
              return n;
            var a = /* @__PURE__ */ Object.create(null);
            if (i.r(a), Object.defineProperty(a, "default", { enumerable: !0, value: n }), 2 & r && typeof n != "string")
              for (var l in n)
                i.d(a, l, function(c) {
                  return n[c];
                }.bind(null, l));
            return a;
          }, i.n = function(n) {
            var r = n && n.__esModule ? function() {
              return n.default;
            } : function() {
              return n;
            };
            return i.d(r, "a", r), r;
          }, i.o = function(n, r) {
            return Object.prototype.hasOwnProperty.call(n, r);
          }, i.p = "", i(i.s = 0);
        }([function(t, o, i) {
          function n(l, c) {
            for (var u = 0; u < c.length; u++) {
              var h = c[u];
              h.enumerable = h.enumerable || !1, h.configurable = !0, "value" in h && (h.writable = !0), Object.defineProperty(l, h.key, h);
            }
          }
          function r(l, c, u) {
            return c && n(l.prototype, c), u && n(l, u), l;
          }
          i.r(o);
          var a = function() {
            function l(c) {
              var u = this;
              ((function(h, f) {
                if (!(h instanceof f))
                  throw new TypeError("Cannot call a class as a function");
              }))(this, l), this.commands = {}, this.keys = {}, this.name = c.name, this.parseShortcutName(c.name), this.element = c.on, this.callback = c.callback, this.executeShortcut = function(h) {
                u.execute(h);
              }, this.element.addEventListener("keydown", this.executeShortcut, !1);
            }
            return r(l, null, [{ key: "supportedCommands", get: function() {
              return { SHIFT: ["SHIFT"], CMD: ["CMD", "CONTROL", "COMMAND", "WINDOWS", "CTRL"], ALT: ["ALT", "OPTION"] };
            } }, { key: "keyCodes", get: function() {
              return { 0: 48, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57, A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90, BACKSPACE: 8, ENTER: 13, ESCAPE: 27, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, INSERT: 45, DELETE: 46, ".": 190 };
            } }]), r(l, [{ key: "parseShortcutName", value: function(c) {
              c = c.split("+");
              for (var u = 0; u < c.length; u++) {
                c[u] = c[u].toUpperCase();
                var h = !1;
                for (var f in l.supportedCommands)
                  if (l.supportedCommands[f].includes(c[u])) {
                    h = this.commands[f] = !0;
                    break;
                  }
                h || (this.keys[c[u]] = !0);
              }
              for (var k in l.supportedCommands)
                this.commands[k] || (this.commands[k] = !1);
            } }, { key: "execute", value: function(c) {
              var u, h = { CMD: c.ctrlKey || c.metaKey, SHIFT: c.shiftKey, ALT: c.altKey }, f = !0;
              for (u in this.commands)
                this.commands[u] !== h[u] && (f = !1);
              var k, p = !0;
              for (k in this.keys)
                p = p && c.keyCode === l.keyCodes[k];
              f && p && this.callback(c);
            } }, { key: "remove", value: function() {
              this.element.removeEventListener("keydown", this.executeShortcut);
            } }]), l;
          }();
          o.default = a;
        }]).default;
      });
    })(zo);
    const Uo = /* @__PURE__ */ xe(_e);
    class $o {
      constructor() {
        this.registeredShortcuts = /* @__PURE__ */ new Map();
      }
      /**
       * Register shortcut
       *
       * @param shortcut - shortcut options
       */
      add(e) {
        if (this.findShortcut(e.on, e.name))
          throw Error(
            `Shortcut ${e.name} is already registered for ${e.on}. Please remove it before add a new handler.`
          );
        const o = new Uo({
          name: e.name,
          on: e.on,
          callback: e.handler
        }), i = this.registeredShortcuts.get(e.on) || [];
        this.registeredShortcuts.set(e.on, [...i, o]);
      }
      /**
       * Remove shortcut
       *
       * @param element - Element shortcut is set for
       * @param name - shortcut name
       */
      remove(e, t) {
        const o = this.findShortcut(e, t);
        if (!o)
          return;
        o.remove();
        const i = this.registeredShortcuts.get(e);
        this.registeredShortcuts.set(e, i.filter((n) => n !== o));
      }
      /**
       * Get Shortcut instance if exist
       *
       * @param element - Element shorcut is set for
       * @param shortcut - shortcut name
       * @returns {number} index - shortcut index if exist
       */
      findShortcut(e, t) {
        return (this.registeredShortcuts.get(e) || []).find(({ name: i }) => i === t);
      }
    }
    const le = new $o();
    var Wo = Object.defineProperty, Yo = Object.getOwnPropertyDescriptor, bt = (s, e, t, o) => {
      for (var i = o > 1 ? void 0 : o ? Yo(e, t) : e, n = s.length - 1, r; n >= 0; n--)
        (r = s[n]) && (i = (o ? r(e, t, i) : r(i)) || i);
      return o && i && Wo(e, t, i), i;
    }, me = /* @__PURE__ */ ((s) => (s.Opened = "toolbox-opened", s.Closed = "toolbox-closed", s.BlockAdded = "toolbox-block-added", s))(me || {});
    const mt = class extends we {
      /**
       * Toolbox constructor
       *
       * @param options - available parameters
       * @param options.api - Editor API methods
       * @param options.tools - Tools available to check whether some of them should be displayed at the Toolbox or not
       */
      constructor({ api: s, tools: e, i18nLabels: t }) {
        super(), this.opened = !1, this.nodes = {
          toolbox: null
        }, this.onPopoverClose = () => {
          this.opened = !1, this.emit(
            "toolbox-closed"
            /* Closed */
          );
        }, this.api = s, this.tools = e, this.i18nLabels = t;
      }
      /**
       * Returns True if Toolbox is Empty and nothing to show
       *
       * @returns {boolean}
       */
      get isEmpty() {
        return this.toolsToBeDisplayed.length === 0;
      }
      /**
       * CSS styles
       *
       * @returns {Object<string, string>}
       */
      static get CSS() {
        return {
          toolbox: "ce-toolbox"
        };
      }
      /**
       * Makes the Toolbox
       */
      make() {
        return this.popover = new je({
          scopeElement: this.api.ui.nodes.redactor,
          searchable: !0,
          messages: {
            nothingFound: this.i18nLabels.nothingFound,
            search: this.i18nLabels.filter
          },
          items: this.toolboxItemsToBeDisplayed
        }), this.popover.on(ge.Close, this.onPopoverClose), this.enableShortcuts(), this.nodes.toolbox = this.popover.getElement(), this.nodes.toolbox.classList.add(mt.CSS.toolbox), this.nodes.toolbox;
      }
      /**
       * Returns true if the Toolbox has the Flipper activated and the Flipper has selected button
       */
      hasFocus() {
        var s;
        return (s = this.popover) == null ? void 0 : s.hasFocus();
      }
      /**
       * Destroy Module
       */
      destroy() {
        var s;
        super.destroy(), this.nodes && this.nodes.toolbox && (this.nodes.toolbox.remove(), this.nodes.toolbox = null), this.removeAllShortcuts(), (s = this.popover) == null || s.off(ge.Close, this.onPopoverClose);
      }
      /**
       * Toolbox Tool's button click handler
       *
       * @param toolName - tool type to be activated
       * @param blockDataOverrides - Block data predefined by the activated Toolbox item
       */
      toolButtonActivated(s, e) {
        this.insertNewBlock(s, e);
      }
      /**
       * Open Toolbox with Tools
       */
      open() {
        var s;
        this.isEmpty || ((s = this.popover) == null || s.show(), this.opened = !0, this.emit(
          "toolbox-opened"
          /* Opened */
        ));
      }
      /**
       * Close Toolbox
       */
      close() {
        var s;
        (s = this.popover) == null || s.hide(), this.opened = !1, this.emit(
          "toolbox-closed"
          /* Closed */
        );
      }
      /**
       * Close Toolbox
       */
      toggle() {
        this.opened ? this.close() : this.open();
      }
      get toolsToBeDisplayed() {
        const s = [];
        return this.tools.forEach((e) => {
          e.toolbox && s.push(e);
        }), s;
      }
      get toolboxItemsToBeDisplayed() {
        const s = (e, t) => ({
          icon: e.icon,
          title: $.t(X.toolNames, e.title || ae(t.name)),
          name: t.name,
          onActivate: () => {
            this.toolButtonActivated(t.name, e.data);
          },
          secondaryLabel: t.shortcut ? Re(t.shortcut) : ""
        });
        return this.toolsToBeDisplayed.reduce((e, t) => (Array.isArray(t.toolbox) ? t.toolbox.forEach((o) => {
          e.push(s(o, t));
        }) : t.toolbox !== void 0 && e.push(s(t.toolbox, t)), e), []);
      }
      /**
       * Iterate all tools and enable theirs shortcuts if specified
       */
      enableShortcuts() {
        this.toolsToBeDisplayed.forEach((s) => {
          const e = s.shortcut;
          e && this.enableShortcutForTool(s.name, e);
        });
      }
      /**
       * Enable shortcut Block Tool implemented shortcut
       *
       * @param {string} toolName - Tool name
       * @param {string} shortcut - shortcut according to the ShortcutData Module format
       */
      enableShortcutForTool(s, e) {
        le.add({
          name: e,
          on: this.api.ui.nodes.redactor,
          handler: (t) => {
            t.preventDefault();
            const o = this.api.blocks.getCurrentBlockIndex(), i = this.api.blocks.getBlockByIndex(o);
            if (i)
              try {
                this.api.blocks.convert(i.id, s), window.requestAnimationFrame(() => {
                  this.api.caret.setToBlock(o, "end");
                });
                return;
              } catch {
              }
            this.insertNewBlock(s);
          }
        });
      }
      /**
       * Removes all added shortcuts
       * Fired when the Read-Only mode is activated
       */
      removeAllShortcuts() {
        this.toolsToBeDisplayed.forEach((s) => {
          const e = s.shortcut;
          e && le.remove(this.api.ui.nodes.redactor, e);
        });
      }
      /**
       * Inserts new block
       * Can be called when button clicked on Toolbox or by ShortcutData
       *
       * @param {string} toolName - Tool name
       * @param blockDataOverrides - predefined Block data
       */
      async insertNewBlock(s, e) {
        const t = this.api.blocks.getCurrentBlockIndex(), o = this.api.blocks.getBlockByIndex(t);
        if (!o)
          return;
        const i = o.isEmpty ? t : t + 1;
        let n;
        if (e) {
          const a = await this.api.blocks.composeBlockData(s);
          n = Object.assign(a, e);
        }
        const r = this.api.blocks.insert(
          s,
          n,
          void 0,
          i,
          void 0,
          o.isEmpty
        );
        r.call(q.APPEND_CALLBACK), this.api.caret.setToBlock(i), this.emit("toolbox-block-added", {
          block: r
        }), this.api.toolbar.close();
      }
    };
    let ze = mt;
    bt([
      ce
    ], ze.prototype, "toolsToBeDisplayed", 1);
    bt([
      ce
    ], ze.prototype, "toolboxItemsToBeDisplayed", 1);
    const kt = "block hovered";
    class Ko extends C {
      /**
       * @class
       * @param moduleConfiguration - Module Configuration
       * @param moduleConfiguration.config - Editor's config
       * @param moduleConfiguration.eventsDispatcher - Editor's event dispatcher
       */
      constructor({ config: e, eventsDispatcher: t }) {
        super({
          config: e,
          eventsDispatcher: t
        }), this.toolboxInstance = null, this.tooltip = new He();
      }
      /**
       * CSS styles
       *
       * @returns {object}
       */
      get CSS() {
        return {
          toolbar: "ce-toolbar",
          content: "ce-toolbar__content",
          actions: "ce-toolbar__actions",
          actionsOpened: "ce-toolbar__actions--opened",
          toolbarOpened: "ce-toolbar--opened",
          openedToolboxHolderModifier: "codex-editor--toolbox-opened",
          plusButton: "ce-toolbar__plus",
          plusButtonShortcut: "ce-toolbar__plus-shortcut",
          settingsToggler: "ce-toolbar__settings-btn",
          settingsTogglerHidden: "ce-toolbar__settings-btn--hidden"
        };
      }
      /**
       * Returns the Toolbar opening state
       *
       * @returns {boolean}
       */
      get opened() {
        return this.nodes.wrapper.classList.contains(this.CSS.toolbarOpened);
      }
      /**
       * Public interface for accessing the Toolbox
       */
      get toolbox() {
        var e;
        return {
          opened: (e = this.toolboxInstance) == null ? void 0 : e.opened,
          close: () => {
            var t;
            (t = this.toolboxInstance) == null || t.close();
          },
          open: () => {
            if (this.toolboxInstance === null) {
              L("toolbox.open() called before initialization is finished", "warn");
              return;
            }
            this.Editor.BlockManager.currentBlock = this.hoveredBlock, this.toolboxInstance.open();
          },
          toggle: () => {
            if (this.toolboxInstance === null) {
              L("toolbox.toggle() called before initialization is finished", "warn");
              return;
            }
            this.toolboxInstance.toggle();
          },
          hasFocus: () => {
            var t;
            return (t = this.toolboxInstance) == null ? void 0 : t.hasFocus();
          }
        };
      }
      /**
       * Block actions appearance manipulations
       */
      get blockActions() {
        return {
          hide: () => {
            this.nodes.actions.classList.remove(this.CSS.actionsOpened);
          },
          show: () => {
            this.nodes.actions.classList.add(this.CSS.actionsOpened);
          }
        };
      }
      /**
       * Methods for working with Block Tunes toggler
       */
      get blockTunesToggler() {
        return {
          hide: () => this.nodes.settingsToggler.classList.add(this.CSS.settingsTogglerHidden),
          show: () => this.nodes.settingsToggler.classList.remove(this.CSS.settingsTogglerHidden)
        };
      }
      /**
       * Toggles read-only mode
       *
       * @param {boolean} readOnlyEnabled - read-only mode
       */
      toggleReadOnly(e) {
        e ? (this.destroy(), this.Editor.BlockSettings.destroy(), this.disableModuleBindings()) : window.requestIdleCallback(() => {
          this.drawUI(), this.enableModuleBindings();
        }, { timeout: 2e3 });
      }
      /**
       * Move Toolbar to the passed (or current) Block
       *
       * @param block - block to move Toolbar near it
       */
      moveAndOpen(e = this.Editor.BlockManager.currentBlock) {
        if (this.toolboxInstance === null) {
          L("Can't open Toolbar since Editor initialization is not finished yet", "warn");
          return;
        }
        if (this.toolboxInstance.opened && this.toolboxInstance.close(), this.Editor.BlockSettings.opened && this.Editor.BlockSettings.close(), !e)
          return;
        this.hoveredBlock = e;
        const t = e.holder, { isMobile: o } = this.Editor.UI, i = e.pluginsContent, n = window.getComputedStyle(i), r = parseInt(n.paddingTop, 10), a = t.offsetHeight;
        let l;
        o ? l = t.offsetTop + a : l = t.offsetTop + r, this.nodes.wrapper.style.top = `${Math.floor(l)}px`, this.Editor.BlockManager.blocks.length === 1 && e.isEmpty ? this.blockTunesToggler.hide() : this.blockTunesToggler.show(), this.open();
      }
      /**
       * Close the Toolbar
       */
      close() {
        var e;
        this.Editor.ReadOnly.isEnabled || (this.nodes.wrapper.classList.remove(this.CSS.toolbarOpened), this.blockActions.hide(), (e = this.toolboxInstance) == null || e.close(), this.Editor.BlockSettings.close());
      }
      /**
       * Open Toolbar with Plus Button and Actions
       *
       * @param {boolean} withBlockActions - by default, Toolbar opens with Block Actions.
       *                                     This flag allows to open Toolbar without Actions.
       */
      open(e = !0) {
        re(() => {
          this.nodes.wrapper.classList.add(this.CSS.toolbarOpened), e ? this.blockActions.show() : this.blockActions.hide();
        }, 50)();
      }
      /**
       * Draws Toolbar elements
       */
      make() {
        this.nodes.wrapper = d.make("div", this.CSS.toolbar), ["content", "actions"].forEach((t) => {
          this.nodes[t] = d.make("div", this.CSS[t]);
        }), d.append(this.nodes.wrapper, this.nodes.content), d.append(this.nodes.content, this.nodes.actions), this.nodes.plusButton = d.make("div", this.CSS.plusButton, {
          innerHTML: _o
        }), d.append(this.nodes.actions, this.nodes.plusButton), this.readOnlyMutableListeners.on(this.nodes.plusButton, "click", () => {
          this.tooltip.hide(!0), this.plusButtonClicked();
        }, !1);
        const e = d.make("div");
        e.appendChild(document.createTextNode($.ui(X.ui.toolbar.toolbox, "Add"))), e.appendChild(d.make("div", this.CSS.plusButtonShortcut, {
          textContent: "⇥ Tab"
        })), this.tooltip.onHover(this.nodes.plusButton, e, {
          hidingDelay: 400
        }), this.nodes.settingsToggler = d.make("span", this.CSS.settingsToggler, {
          innerHTML: Ao
        }), d.append(this.nodes.actions, this.nodes.settingsToggler), this.tooltip.onHover(
          this.nodes.settingsToggler,
          $.ui(X.ui.blockTunes.toggler, "Click to tune"),
          {
            hidingDelay: 400
          }
        ), d.append(this.nodes.actions, this.makeToolbox()), d.append(this.nodes.actions, this.Editor.BlockSettings.getElement()), d.append(this.Editor.UI.nodes.wrapper, this.nodes.wrapper);
      }
      /**
       * Creates the Toolbox instance and return it's rendered element
       */
      makeToolbox() {
        return this.toolboxInstance = new ze({
          api: this.Editor.API.methods,
          tools: this.Editor.Tools.blockTools,
          i18nLabels: {
            filter: $.ui(X.ui.popover, "Filter"),
            nothingFound: $.ui(X.ui.popover, "Nothing found")
          }
        }), this.toolboxInstance.on(me.Opened, () => {
          this.Editor.UI.nodes.wrapper.classList.add(this.CSS.openedToolboxHolderModifier);
        }), this.toolboxInstance.on(me.Closed, () => {
          this.Editor.UI.nodes.wrapper.classList.remove(this.CSS.openedToolboxHolderModifier);
        }), this.toolboxInstance.on(me.BlockAdded, ({ block: e }) => {
          const { BlockManager: t, Caret: o } = this.Editor, i = t.getBlockById(e.id);
          i.inputs.length === 0 && (i === t.lastBlock ? (t.insertAtEnd(), o.setToBlock(t.lastBlock)) : o.setToBlock(t.nextBlock));
        }), this.toolboxInstance.make();
      }
      /**
       * Handler for Plus Button
       */
      plusButtonClicked() {
        var e;
        this.Editor.BlockManager.currentBlock = this.hoveredBlock, (e = this.toolboxInstance) == null || e.toggle();
      }
      /**
       * Enable bindings
       */
      enableModuleBindings() {
        this.readOnlyMutableListeners.on(this.nodes.settingsToggler, "mousedown", (e) => {
          var t;
          e.stopPropagation(), this.settingsTogglerClicked(), (t = this.toolboxInstance) != null && t.opened && this.toolboxInstance.close(), this.tooltip.hide(!0);
        }, !0), te() || this.eventsDispatcher.on(kt, (e) => {
          var t;
          this.Editor.BlockSettings.opened || (t = this.toolboxInstance) != null && t.opened || this.moveAndOpen(e.block);
        });
      }
      /**
       * Disable bindings
       */
      disableModuleBindings() {
        this.readOnlyMutableListeners.clearAll();
      }
      /**
       * Clicks on the Block Settings toggler
       */
      settingsTogglerClicked() {
        this.Editor.BlockManager.currentBlock = this.hoveredBlock, this.Editor.BlockSettings.opened ? this.Editor.BlockSettings.close() : this.Editor.BlockSettings.open(this.hoveredBlock);
      }
      /**
       * Draws Toolbar UI
       *
       * Toolbar contains BlockSettings and Toolbox.
       * That's why at first we draw its components and then Toolbar itself
       *
       * Steps:
       *  - Make Toolbar dependent components like BlockSettings, Toolbox and so on
       *  - Make itself and append dependent nodes to itself
       *
       */
      drawUI() {
        this.Editor.BlockSettings.make(), this.make();
      }
      /**
       * Removes all created and saved HTMLElements
       * It is used in Read-Only mode
       */
      destroy() {
        this.removeAllNodes(), this.toolboxInstance && this.toolboxInstance.destroy(), this.tooltip.destroy();
      }
    }
    var ye = /* @__PURE__ */ ((s) => (s[s.Block = 0] = "Block", s[s.Inline = 1] = "Inline", s[s.Tune = 2] = "Tune", s))(ye || {}), ke = /* @__PURE__ */ ((s) => (s.Shortcut = "shortcut", s.Toolbox = "toolbox", s.EnabledInlineTools = "inlineToolbar", s.EnabledBlockTunes = "tunes", s.Config = "config", s))(ke || {}), vt = /* @__PURE__ */ ((s) => (s.Shortcut = "shortcut", s.SanitizeConfig = "sanitize", s))(vt || {}), se = /* @__PURE__ */ ((s) => (s.IsEnabledLineBreaks = "enableLineBreaks", s.Toolbox = "toolbox", s.ConversionConfig = "conversionConfig", s.IsReadOnlySupported = "isReadOnlySupported", s.PasteConfig = "pasteConfig", s))(se || {}), Ue = /* @__PURE__ */ ((s) => (s.IsInline = "isInline", s.Title = "title", s))(Ue || {}), xt = /* @__PURE__ */ ((s) => (s.IsTune = "isTune", s))(xt || {});
    class $e {
      /**
       * @class
       * @param {ConstructorOptions} options - Constructor options
       */
      constructor({
        name: e,
        constructable: t,
        config: o,
        api: i,
        isDefault: n,
        isInternal: r = !1,
        defaultPlaceholder: a
      }) {
        this.api = i, this.name = e, this.constructable = t, this.config = o, this.isDefault = n, this.isInternal = r, this.defaultPlaceholder = a;
      }
      /**
       * Returns Tool user configuration
       */
      get settings() {
        const e = this.config.config || {};
        return this.isDefault && !("placeholder" in e) && this.defaultPlaceholder && (e.placeholder = this.defaultPlaceholder), e;
      }
      /**
       * Calls Tool's reset method
       */
      reset() {
        if (D(this.constructable.reset))
          return this.constructable.reset();
      }
      /**
       * Calls Tool's prepare method
       */
      prepare() {
        if (D(this.constructable.prepare))
          return this.constructable.prepare({
            toolName: this.name,
            config: this.settings
          });
      }
      /**
       * Returns shortcut for Tool (internal or specified by user)
       */
      get shortcut() {
        const e = this.constructable.shortcut;
        return this.config.shortcut || e;
      }
      /**
       * Returns Tool's sanitizer configuration
       */
      get sanitizeConfig() {
        return this.constructable.sanitize || {};
      }
      /**
       * Returns true if Tools is inline
       */
      isInline() {
        return this.type === 1;
      }
      /**
       * Returns true if Tools is block
       */
      isBlock() {
        return this.type === 0;
      }
      /**
       * Returns true if Tools is tune
       */
      isTune() {
        return this.type === 2;
      }
    }
    class Xo extends C {
      /**
       * @class
       * @param moduleConfiguration - Module Configuration
       * @param moduleConfiguration.config - Editor's config
       * @param moduleConfiguration.eventsDispatcher - Editor's event dispatcher
       */
      constructor({ config: e, eventsDispatcher: t }) {
        super({
          config: e,
          eventsDispatcher: t
        }), this.CSS = {
          inlineToolbar: "ce-inline-toolbar",
          inlineToolbarShowed: "ce-inline-toolbar--showed",
          inlineToolbarLeftOriented: "ce-inline-toolbar--left-oriented",
          inlineToolbarRightOriented: "ce-inline-toolbar--right-oriented",
          inlineToolbarShortcut: "ce-inline-toolbar__shortcut",
          buttonsWrapper: "ce-inline-toolbar__buttons",
          actionsWrapper: "ce-inline-toolbar__actions",
          inlineToolButton: "ce-inline-tool",
          inputField: "cdx-input",
          focusedButton: "ce-inline-tool--focused",
          conversionToggler: "ce-inline-toolbar__dropdown",
          conversionTogglerArrow: "ce-inline-toolbar__dropdown-arrow",
          conversionTogglerHidden: "ce-inline-toolbar__dropdown--hidden",
          conversionTogglerContent: "ce-inline-toolbar__dropdown-content",
          togglerAndButtonsWrapper: "ce-inline-toolbar__toggler-and-button-wrapper"
        }, this.opened = !1, this.toolbarVerticalMargin = te() ? 20 : 6, this.buttonsList = null, this.width = 0, this.flipper = null, this.tooltip = new He();
      }
      /**
       * Toggles read-only mode
       *
       * @param {boolean} readOnlyEnabled - read-only mode
       */
      toggleReadOnly(e) {
        e ? (this.destroy(), this.Editor.ConversionToolbar.destroy()) : window.requestIdleCallback(() => {
          this.make();
        }, { timeout: 2e3 });
      }
      /**
       *  Moving / appearance
       *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       */
      /**
       * Shows Inline Toolbar if something is selected
       *
       * @param [needToClose] - pass true to close toolbar if it is not allowed.
       *                                  Avoid to use it just for closing IT, better call .close() clearly.
       * @param [needToShowConversionToolbar] - pass false to not to show Conversion Toolbar
       */
      tryToShow(e = !1, t = !0) {
        if (!this.allowedToShow()) {
          e && this.close();
          return;
        }
        this.move(), this.open(t), this.Editor.Toolbar.close();
      }
      /**
       * Move Toolbar to the selected text
       */
      move() {
        const e = m.rect, t = this.Editor.UI.nodes.wrapper.getBoundingClientRect(), o = {
          x: e.x - t.left,
          y: e.y + e.height - // + window.scrollY
          t.top + this.toolbarVerticalMargin
        };
        e.width && (o.x += Math.floor(e.width / 2));
        const i = o.x - this.width / 2, n = o.x + this.width / 2;
        this.nodes.wrapper.classList.toggle(
          this.CSS.inlineToolbarLeftOriented,
          i < this.Editor.UI.contentRect.left
        ), this.nodes.wrapper.classList.toggle(
          this.CSS.inlineToolbarRightOriented,
          n > this.Editor.UI.contentRect.right
        ), this.nodes.wrapper.style.left = Math.floor(o.x) + "px", this.nodes.wrapper.style.top = Math.floor(o.y) + "px";
      }
      /**
       * Hides Inline Toolbar
       */
      close() {
        this.opened && (this.Editor.ReadOnly.isEnabled || (this.nodes.wrapper.classList.remove(this.CSS.inlineToolbarShowed), Array.from(this.toolsInstances.entries()).forEach(([e, t]) => {
          const o = this.getToolShortcut(e);
          o && le.remove(this.Editor.UI.nodes.redactor, o), D(t.clear) && t.clear();
        }), this.opened = !1, this.flipper.deactivate(), this.Editor.ConversionToolbar.close()));
      }
      /**
       * Shows Inline Toolbar
       *
       * @param [needToShowConversionToolbar] - pass false to not to show Conversion Toolbar
       */
      open(e = !0) {
        if (this.opened)
          return;
        this.addToolsFiltered(), this.nodes.wrapper.classList.add(this.CSS.inlineToolbarShowed), this.buttonsList = this.nodes.buttons.querySelectorAll(`.${this.CSS.inlineToolButton}`), this.opened = !0, e && this.Editor.ConversionToolbar.hasTools() ? this.setConversionTogglerContent() : this.nodes.conversionToggler.hidden = !0;
        let t = Array.from(this.buttonsList);
        t.unshift(this.nodes.conversionToggler), t = t.filter((o) => !o.hidden), this.flipper.activate(t);
      }
      /**
       * Check if node is contained by Inline Toolbar
       *
       * @param {Node} node — node to check
       */
      containsNode(e) {
        return this.nodes.wrapper.contains(e);
      }
      /**
       * Removes UI and its components
       */
      destroy() {
        this.flipper && (this.flipper.deactivate(), this.flipper = null), this.removeAllNodes(), this.tooltip.destroy();
      }
      /**
       * Making DOM
       */
      make() {
        this.nodes.wrapper = d.make("div", [
          this.CSS.inlineToolbar,
          ...this.isRtl ? [this.Editor.UI.CSS.editorRtlFix] : []
        ]), this.nodes.togglerAndButtonsWrapper = d.make("div", this.CSS.togglerAndButtonsWrapper), this.nodes.buttons = d.make("div", this.CSS.buttonsWrapper), this.nodes.actions = d.make("div", this.CSS.actionsWrapper), this.listeners.on(this.nodes.wrapper, "mousedown", (e) => {
          e.target.closest(`.${this.CSS.actionsWrapper}`) || e.preventDefault();
        }), d.append(this.nodes.wrapper, [this.nodes.togglerAndButtonsWrapper, this.nodes.actions]), d.append(this.Editor.UI.nodes.wrapper, this.nodes.wrapper), this.addConversionToggler(), d.append(this.nodes.togglerAndButtonsWrapper, this.nodes.buttons), this.prepareConversionToolbar(), window.requestAnimationFrame(() => {
          this.recalculateWidth();
        }), this.enableFlipper();
      }
      /**
       * Need to show Inline Toolbar or not
       */
      allowedToShow() {
        const e = ["IMG", "INPUT"], t = m.get(), o = m.text;
        if (!t || !t.anchorNode || t.isCollapsed || o.length < 1)
          return !1;
        const i = d.isElement(t.anchorNode) ? t.anchorNode : t.anchorNode.parentElement;
        if (t && e.includes(i.tagName) || i.closest('[contenteditable="true"]') === null)
          return !1;
        const r = this.Editor.BlockManager.getBlock(t.anchorNode);
        return r ? r.tool.inlineTools.size !== 0 : !1;
      }
      /**
       * Recalculate inline toolbar width
       */
      recalculateWidth() {
        this.width = this.nodes.wrapper.offsetWidth;
      }
      /**
       * Create a toggler for Conversion Dropdown
       * and prepend it to the buttons list
       */
      addConversionToggler() {
        this.nodes.conversionToggler = d.make("div", this.CSS.conversionToggler), this.nodes.conversionTogglerContent = d.make("div", this.CSS.conversionTogglerContent);
        const e = d.make("div", this.CSS.conversionTogglerArrow, {
          innerHTML: ft
        });
        this.nodes.conversionToggler.appendChild(this.nodes.conversionTogglerContent), this.nodes.conversionToggler.appendChild(e), this.nodes.togglerAndButtonsWrapper.appendChild(this.nodes.conversionToggler), this.listeners.on(this.nodes.conversionToggler, "click", () => {
          this.Editor.ConversionToolbar.toggle((t) => {
            !t && this.opened ? this.flipper.activate() : this.opened && this.flipper.deactivate();
          });
        }), te() === !1 && this.tooltip.onHover(this.nodes.conversionToggler, $.ui(X.ui.inlineToolbar.converter, "Convert to"), {
          placement: "top",
          hidingDelay: 100
        });
      }
      /**
       * Changes Conversion Dropdown content for current block's Tool
       */
      async setConversionTogglerContent() {
        const { BlockManager: e } = this.Editor, { currentBlock: t } = e, o = t.name, i = t.tool.conversionConfig, n = i && i.export;
        this.nodes.conversionToggler.hidden = !n, this.nodes.conversionToggler.classList.toggle(this.CSS.conversionTogglerHidden, !n);
        const r = await t.getActiveToolboxEntry() || {};
        this.nodes.conversionTogglerContent.innerHTML = r.icon || r.title || ae(o);
      }
      /**
       * Makes the Conversion Dropdown
       */
      prepareConversionToolbar() {
        const e = this.Editor.ConversionToolbar.make();
        d.append(this.nodes.wrapper, e);
      }
      /**
       *  Working with Tools
       *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       */
      /**
       * Append only allowed Tools
       */
      addToolsFiltered() {
        const e = m.get(), t = this.Editor.BlockManager.getBlock(e.anchorNode);
        this.nodes.buttons.innerHTML = "", this.nodes.actions.innerHTML = "", this.toolsInstances = /* @__PURE__ */ new Map(), Array.from(t.tool.inlineTools.values()).forEach((o) => {
          this.addTool(o);
        }), this.recalculateWidth();
      }
      /**
       * Add tool button and activate clicks
       *
       * @param {InlineTool} tool - InlineTool object
       */
      addTool(e) {
        const t = e.create(), o = t.render();
        if (!o) {
          L("Render method must return an instance of Node", "warn", e.name);
          return;
        }
        if (o.dataset.tool = e.name, this.nodes.buttons.appendChild(o), this.toolsInstances.set(e.name, t), D(t.renderActions)) {
          const a = t.renderActions();
          this.nodes.actions.appendChild(a);
        }
        this.listeners.on(o, "click", (a) => {
          this.toolClicked(t), a.preventDefault();
        });
        const i = this.getToolShortcut(e.name);
        if (i)
          try {
            this.enableShortcuts(t, i);
          } catch {
          }
        const n = d.make("div"), r = $.t(
          X.toolNames,
          e.title || ae(e.name)
        );
        n.appendChild(d.text(r)), i && n.appendChild(d.make("div", this.CSS.inlineToolbarShortcut, {
          textContent: Re(i)
        })), te() === !1 && this.tooltip.onHover(o, n, {
          placement: "top",
          hidingDelay: 100
        }), t.checkState(m.get());
      }
      /**
       * Get shortcut name for tool
       *
       * @param toolName — Tool name
       */
      getToolShortcut(e) {
        const { Tools: t } = this.Editor, o = t.inlineTools.get(e), i = t.internal.inlineTools;
        return Array.from(i.keys()).includes(e) ? this.inlineTools[e][vt.Shortcut] : o.shortcut;
      }
      /**
       * Enable Tool shortcut with Editor Shortcuts Module
       *
       * @param {InlineTool} tool - Tool instance
       * @param {string} shortcut - shortcut according to the ShortcutData Module format
       */
      enableShortcuts(e, t) {
        le.add({
          name: t,
          handler: (o) => {
            const { currentBlock: i } = this.Editor.BlockManager;
            i && i.tool.enabledInlineTools && (o.preventDefault(), this.toolClicked(e));
          },
          on: this.Editor.UI.nodes.redactor
        });
      }
      /**
       * Inline Tool button clicks
       *
       * @param {InlineTool} tool - Tool's instance
       */
      toolClicked(e) {
        const t = m.range;
        e.surround(t), this.checkToolsState(), e.renderActions !== void 0 && this.flipper.deactivate();
      }
      /**
       * Check Tools` state by selection
       */
      checkToolsState() {
        this.toolsInstances.forEach((e) => {
          e.checkState(m.get());
        });
      }
      /**
       * Get inline tools tools
       * Tools that has isInline is true
       */
      get inlineTools() {
        const e = {};
        return Array.from(this.Editor.Tools.inlineTools.entries()).forEach(([t, o]) => {
          e[t] = o.create();
        }), e;
      }
      /**
       * Allow to leaf buttons by arrows / tab
       * Buttons will be filled on opening
       */
      enableFlipper() {
        this.flipper = new G({
          focusedItemClass: this.CSS.focusedButton,
          allowedKeys: [
            B.ENTER,
            B.TAB
          ]
        });
      }
    }
    class Vo extends C {
      /**
       * All keydowns on Block
       *
       * @param {KeyboardEvent} event - keydown
       */
      keydown(e) {
        switch (this.beforeKeydownProcessing(e), e.keyCode) {
          case B.BACKSPACE:
            this.backspace(e);
            break;
          case B.DELETE:
            this.delete(e);
            break;
          case B.ENTER:
            this.enter(e);
            break;
          case B.DOWN:
          case B.RIGHT:
            this.arrowRightAndDown(e);
            break;
          case B.UP:
          case B.LEFT:
            this.arrowLeftAndUp(e);
            break;
          case B.TAB:
            this.tabPressed(e);
            break;
        }
      }
      /**
       * Fires on keydown before event processing
       *
       * @param {KeyboardEvent} event - keydown
       */
      beforeKeydownProcessing(e) {
        this.needToolbarClosing(e) && nt(e.keyCode) && (this.Editor.Toolbar.close(), this.Editor.ConversionToolbar.close(), e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || (this.Editor.BlockManager.clearFocused(), this.Editor.BlockSelection.clearSelection(e)));
      }
      /**
       * Key up on Block:
       * - shows Inline Toolbar if something selected
       * - shows conversion toolbar with 85% of block selection
       *
       * @param {KeyboardEvent} event - keyup event
       */
      keyup(e) {
        e.shiftKey || this.Editor.UI.checkEmptiness();
      }
      /**
       * Open Toolbox to leaf Tools
       *
       * @param {KeyboardEvent} event - tab keydown event
       */
      tabPressed(e) {
        this.Editor.BlockSelection.clearSelection(e);
        const { BlockManager: t, InlineToolbar: o, ConversionToolbar: i } = this.Editor, n = t.currentBlock;
        if (!n)
          return;
        const r = n.isEmpty, a = n.tool.isDefault && r, l = !r && i.opened, c = !r && !m.isCollapsed && o.opened;
        a ? this.activateToolbox() : !l && !c && this.activateBlockSettings();
      }
      /**
       * Add drop target styles
       *
       * @param {DragEvent} event - drag over event
       */
      dragOver(e) {
        const t = this.Editor.BlockManager.getBlockByChildNode(e.target);
        t.dropTarget = !0;
      }
      /**
       * Remove drop target style
       *
       * @param {DragEvent} event - drag leave event
       */
      dragLeave(e) {
        const t = this.Editor.BlockManager.getBlockByChildNode(e.target);
        t.dropTarget = !1;
      }
      /**
       * Copying selected blocks
       * Before putting to the clipboard we sanitize all blocks and then copy to the clipboard
       *
       * @param {ClipboardEvent} event - clipboard event
       */
      handleCommandC(e) {
        const { BlockSelection: t } = this.Editor;
        t.anyBlockSelected && t.copySelectedBlocks(e);
      }
      /**
       * Copy and Delete selected Blocks
       *
       * @param {ClipboardEvent} event - clipboard event
       */
      handleCommandX(e) {
        const { BlockSelection: t, BlockManager: o, Caret: i } = this.Editor;
        t.anyBlockSelected && t.copySelectedBlocks(e).then(() => {
          const n = o.removeSelectedBlocks(), r = o.insertDefaultBlockAtIndex(n, !0);
          i.setToBlock(r, i.positions.START), t.clearSelection(e);
        });
      }
      /**
       * ENTER pressed on block
       *
       * @param {KeyboardEvent} event - keydown
       */
      enter(e) {
        const { BlockManager: t, UI: o } = this.Editor;
        if (t.currentBlock.tool.isLineBreaksEnabled || o.someToolbarOpened && o.someFlipperButtonFocused || e.shiftKey)
          return;
        let n = this.Editor.BlockManager.currentBlock;
        this.Editor.Caret.isAtStart && !this.Editor.BlockManager.currentBlock.hasMedia ? this.Editor.BlockManager.insertDefaultBlockAtIndex(this.Editor.BlockManager.currentBlockIndex) : this.Editor.Caret.isAtEnd ? n = this.Editor.BlockManager.insertDefaultBlockAtIndex(this.Editor.BlockManager.currentBlockIndex + 1) : n = this.Editor.BlockManager.split(), this.Editor.Caret.setToBlock(n), this.Editor.Toolbar.moveAndOpen(n), e.preventDefault();
      }
      /**
       * Handle backspace keydown on Block
       *
       * @param {KeyboardEvent} event - keydown
       */
      backspace(e) {
        const { BlockManager: t, Caret: o } = this.Editor, { currentBlock: i, previousBlock: n } = t;
        if (!m.isCollapsed || !o.isAtStart)
          return;
        if (e.preventDefault(), this.Editor.Toolbar.close(), !(i.currentInput === i.firstInput)) {
          o.navigatePrevious();
          return;
        }
        if (n === null)
          return;
        if (n.isEmpty) {
          t.removeBlock(n);
          return;
        }
        if (i.isEmpty) {
          t.removeBlock(i);
          const l = t.currentBlock;
          o.setToBlock(l, o.positions.END);
          return;
        }
        Je(i, n) ? this.mergeBlocks(n, i) : o.setToBlock(n, o.positions.END);
      }
      /**
       * Handles delete keydown on Block
       * Removes char after the caret.
       * If caret is at the end of the block, merge next block with current
       *
       * @param {KeyboardEvent} event - keydown
       */
      delete(e) {
        const { BlockManager: t, Caret: o } = this.Editor, { currentBlock: i, nextBlock: n } = t;
        if (!m.isCollapsed || !o.isAtEnd)
          return;
        if (e.preventDefault(), this.Editor.Toolbar.close(), !(i.currentInput === i.lastInput)) {
          o.navigateNext();
          return;
        }
        if (n === null)
          return;
        if (n.isEmpty) {
          t.removeBlock(n);
          return;
        }
        if (i.isEmpty) {
          t.removeBlock(i), o.setToBlock(n, o.positions.START);
          return;
        }
        Je(i, n) ? this.mergeBlocks(i, n) : o.setToBlock(n, o.positions.START);
      }
      /**
       * Merge passed Blocks
       *
       * @param targetBlock - to which Block we want to merge
       * @param blockToMerge - what Block we want to merge
       */
      mergeBlocks(e, t) {
        const { BlockManager: o, Caret: i, Toolbar: n } = this.Editor;
        i.createShadow(e.pluginsContent), o.mergeBlocks(e, t).then(() => {
          window.requestAnimationFrame(() => {
            i.restoreCaret(e.pluginsContent), e.pluginsContent.normalize(), n.close();
          });
        });
      }
      /**
       * Handle right and down keyboard keys
       *
       * @param {KeyboardEvent} event - keyboard event
       */
      arrowRightAndDown(e) {
        const t = G.usedKeys.includes(e.keyCode) && (!e.shiftKey || e.keyCode === B.TAB);
        if (this.Editor.UI.someToolbarOpened && t)
          return;
        this.Editor.BlockManager.clearFocused(), this.Editor.Toolbar.close();
        const o = this.Editor.Caret.isAtEnd || this.Editor.BlockSelection.anyBlockSelected;
        if (e.shiftKey && e.keyCode === B.DOWN && o) {
          this.Editor.CrossBlockSelection.toggleBlockSelectedState();
          return;
        }
        (e.keyCode === B.DOWN || e.keyCode === B.RIGHT && !this.isRtl ? this.Editor.Caret.navigateNext() : this.Editor.Caret.navigatePrevious()) ? e.preventDefault() : re(() => {
          this.Editor.BlockManager.currentBlock && this.Editor.BlockManager.currentBlock.updateCurrentInput();
        }, 20)(), this.Editor.BlockSelection.clearSelection(e);
      }
      /**
       * Handle left and up keyboard keys
       *
       * @param {KeyboardEvent} event - keyboard event
       */
      arrowLeftAndUp(e) {
        if (this.Editor.UI.someToolbarOpened) {
          if (G.usedKeys.includes(e.keyCode) && (!e.shiftKey || e.keyCode === B.TAB))
            return;
          this.Editor.UI.closeAllToolbars();
        }
        this.Editor.BlockManager.clearFocused(), this.Editor.Toolbar.close();
        const t = this.Editor.Caret.isAtStart || this.Editor.BlockSelection.anyBlockSelected;
        if (e.shiftKey && e.keyCode === B.UP && t) {
          this.Editor.CrossBlockSelection.toggleBlockSelectedState(!1);
          return;
        }
        (e.keyCode === B.UP || e.keyCode === B.LEFT && !this.isRtl ? this.Editor.Caret.navigatePrevious() : this.Editor.Caret.navigateNext()) ? e.preventDefault() : re(() => {
          this.Editor.BlockManager.currentBlock && this.Editor.BlockManager.currentBlock.updateCurrentInput();
        }, 20)(), this.Editor.BlockSelection.clearSelection(e);
      }
      /**
       * Cases when we need to close Toolbar
       *
       * @param {KeyboardEvent} event - keyboard event
       */
      needToolbarClosing(e) {
        const t = e.keyCode === B.ENTER && this.Editor.Toolbar.toolbox.opened, o = e.keyCode === B.ENTER && this.Editor.BlockSettings.opened, i = e.keyCode === B.ENTER && this.Editor.InlineToolbar.opened, n = e.keyCode === B.ENTER && this.Editor.ConversionToolbar.opened, r = e.keyCode === B.TAB;
        return !(e.shiftKey || r || t || o || i || n);
      }
      /**
       * If Toolbox is not open, then just open it and show plus button
       */
      activateToolbox() {
        this.Editor.Toolbar.opened || this.Editor.Toolbar.moveAndOpen(), this.Editor.Toolbar.toolbox.open();
      }
      /**
       * Open Toolbar and show BlockSettings before flipping Tools
       */
      activateBlockSettings() {
        this.Editor.Toolbar.opened || (this.Editor.BlockManager.currentBlock.focused = !0, this.Editor.Toolbar.moveAndOpen()), this.Editor.BlockSettings.opened || this.Editor.BlockSettings.open();
      }
    }
    class Te {
      /**
       * @class
       * @param {HTMLElement} workingArea — editor`s working node
       */
      constructor(e) {
        this.blocks = [], this.workingArea = e;
      }
      /**
       * Get length of Block instances array
       *
       * @returns {number}
       */
      get length() {
        return this.blocks.length;
      }
      /**
       * Get Block instances array
       *
       * @returns {Block[]}
       */
      get array() {
        return this.blocks;
      }
      /**
       * Get blocks html elements array
       *
       * @returns {HTMLElement[]}
       */
      get nodes() {
        return st(this.workingArea.children);
      }
      /**
       * Proxy trap to implement array-like setter
       *
       * @example
       * blocks[0] = new Block(...)
       * @param {Blocks} instance — Blocks instance
       * @param {PropertyKey} property — block index or any Blocks class property key to set
       * @param {Block} value — value to set
       * @returns {boolean}
       */
      static set(e, t, o) {
        return isNaN(Number(t)) ? (Reflect.set(e, t, o), !0) : (e.insert(+t, o), !0);
      }
      /**
       * Proxy trap to implement array-like getter
       *
       * @param {Blocks} instance — Blocks instance
       * @param {PropertyKey} property — Blocks class property key
       * @returns {Block|*}
       */
      static get(e, t) {
        return isNaN(Number(t)) ? Reflect.get(e, t) : e.get(+t);
      }
      /**
       * Push new Block to the blocks array and append it to working area
       *
       * @param {Block} block - Block to add
       */
      push(e) {
        this.blocks.push(e), this.insertToDOM(e);
      }
      /**
       * Swaps blocks with indexes first and second
       *
       * @param {number} first - first block index
       * @param {number} second - second block index
       * @deprecated — use 'move' instead
       */
      swap(e, t) {
        const o = this.blocks[t];
        d.swap(this.blocks[e].holder, o.holder), this.blocks[t] = this.blocks[e], this.blocks[e] = o;
      }
      /**
       * Move a block from one to another index
       *
       * @param {number} toIndex - new index of the block
       * @param {number} fromIndex - block to move
       */
      move(e, t) {
        const o = this.blocks.splice(t, 1)[0], i = e - 1, n = Math.max(0, i), r = this.blocks[n];
        e > 0 ? this.insertToDOM(o, "afterend", r) : this.insertToDOM(o, "beforebegin", r), this.blocks.splice(e, 0, o);
        const a = this.composeBlockEvent("move", {
          fromIndex: t,
          toIndex: e
        });
        o.call(q.MOVED, a);
      }
      /**
       * Insert new Block at passed index
       *
       * @param {number} index — index to insert Block
       * @param {Block} block — Block to insert
       * @param {boolean} replace — it true, replace block on given index
       */
      insert(e, t, o = !1) {
        if (!this.length) {
          this.push(t);
          return;
        }
        e > this.length && (e = this.length), o && (this.blocks[e].holder.remove(), this.blocks[e].call(q.REMOVED));
        const i = o ? 1 : 0;
        if (this.blocks.splice(e, i, t), e > 0) {
          const n = this.blocks[e - 1];
          this.insertToDOM(t, "afterend", n);
        } else {
          const n = this.blocks[e + 1];
          n ? this.insertToDOM(t, "beforebegin", n) : this.insertToDOM(t);
        }
      }
      /**
       * Replaces block under passed index with passed block
       *
       * @param index - index of existed block
       * @param block - new block
       */
      replace(e, t) {
        if (this.blocks[e] === void 0)
          throw Error("Incorrect index");
        this.blocks[e].holder.replaceWith(t.holder), this.blocks[e] = t;
      }
      /**
       * Inserts several blocks at once
       *
       * @param blocks - blocks to insert
       * @param index - index to insert blocks at
       */
      insertMany(e, t) {
        const o = new DocumentFragment();
        for (const i of e)
          o.appendChild(i.holder);
        if (this.length > 0) {
          if (t > 0) {
            const i = Math.min(t - 1, this.length - 1);
            this.blocks[i].holder.after(o);
          } else
            t === 0 && this.workingArea.prepend(o);
          this.blocks.splice(t, 0, ...e);
        } else
          this.blocks.push(...e), this.workingArea.appendChild(o);
        e.forEach((i) => i.call(q.RENDERED));
      }
      /**
       * Remove block
       *
       * @param {number} index - index of Block to remove
       */
      remove(e) {
        isNaN(e) && (e = this.length - 1), this.blocks[e].holder.remove(), this.blocks[e].call(q.REMOVED), this.blocks.splice(e, 1);
      }
      /**
       * Remove all blocks
       */
      removeAll() {
        this.workingArea.innerHTML = "", this.blocks.forEach((e) => e.call(q.REMOVED)), this.blocks.length = 0;
      }
      /**
       * Insert Block after passed target
       *
       * @todo decide if this method is necessary
       * @param {Block} targetBlock — target after which Block should be inserted
       * @param {Block} newBlock — Block to insert
       */
      insertAfter(e, t) {
        const o = this.blocks.indexOf(e);
        this.insert(o + 1, t);
      }
      /**
       * Get Block by index
       *
       * @param {number} index — Block index
       * @returns {Block}
       */
      get(e) {
        return this.blocks[e];
      }
      /**
       * Return index of passed Block
       *
       * @param {Block} block - Block to find
       * @returns {number}
       */
      indexOf(e) {
        return this.blocks.indexOf(e);
      }
      /**
       * Insert new Block into DOM
       *
       * @param {Block} block - Block to insert
       * @param {InsertPosition} position — insert position (if set, will use insertAdjacentElement)
       * @param {Block} target — Block related to position
       */
      insertToDOM(e, t, o) {
        t ? o.holder.insertAdjacentElement(t, e.holder) : this.workingArea.appendChild(e.holder), e.call(q.RENDERED);
      }
      /**
       * Composes Block event with passed type and details
       *
       * @param {string} type - event type
       * @param {object} detail - event detail
       */
      composeBlockEvent(e, t) {
        return new CustomEvent(e, {
          detail: t
        });
      }
    }
    const et = "block-removed", tt = "block-added", qo = "block-moved", ot = "block-changed";
    class Zo {
      constructor() {
        this.completed = Promise.resolve();
      }
      /**
       * Add new promise to queue
       *
       * @param operation - promise should be added to queue
       */
      add(e) {
        return new Promise((t, o) => {
          this.completed = this.completed.then(e).then(t).catch(o);
        });
      }
    }
    class Go extends C {
      constructor() {
        super(...arguments), this._currentBlockIndex = -1, this._blocks = null;
      }
      /**
       * Returns current Block index
       *
       * @returns {number}
       */
      get currentBlockIndex() {
        return this._currentBlockIndex;
      }
      /**
       * Set current Block index and fire Block lifecycle callbacks
       *
       * @param {number} newIndex - index of Block to set as current
       */
      set currentBlockIndex(e) {
        this._currentBlockIndex = e;
      }
      /**
       * returns first Block
       *
       * @returns {Block}
       */
      get firstBlock() {
        return this._blocks[0];
      }
      /**
       * returns last Block
       *
       * @returns {Block}
       */
      get lastBlock() {
        return this._blocks[this._blocks.length - 1];
      }
      /**
       * Get current Block instance
       *
       * @returns {Block}
       */
      get currentBlock() {
        return this._blocks[this.currentBlockIndex];
      }
      /**
       * Set passed Block as a current
       *
       * @param block - block to set as a current
       */
      set currentBlock(e) {
        this.currentBlockIndex = this.getBlockIndex(e);
      }
      /**
       * Returns next Block instance
       *
       * @returns {Block|null}
       */
      get nextBlock() {
        return this.currentBlockIndex === this._blocks.length - 1 ? null : this._blocks[this.currentBlockIndex + 1];
      }
      /**
       * Return first Block with inputs after current Block
       *
       * @returns {Block | undefined}
       */
      get nextContentfulBlock() {
        return this.blocks.slice(this.currentBlockIndex + 1).find((t) => !!t.inputs.length);
      }
      /**
       * Return first Block with inputs before current Block
       *
       * @returns {Block | undefined}
       */
      get previousContentfulBlock() {
        return this.blocks.slice(0, this.currentBlockIndex).reverse().find((t) => !!t.inputs.length);
      }
      /**
       * Returns previous Block instance
       *
       * @returns {Block|null}
       */
      get previousBlock() {
        return this.currentBlockIndex === 0 ? null : this._blocks[this.currentBlockIndex - 1];
      }
      /**
       * Get array of Block instances
       *
       * @returns {Block[]} {@link Blocks#array}
       */
      get blocks() {
        return this._blocks.array;
      }
      /**
       * Check if each Block is empty
       *
       * @returns {boolean}
       */
      get isEditorEmpty() {
        return this.blocks.every((e) => e.isEmpty);
      }
      /**
       * Should be called after Editor.UI preparation
       * Define this._blocks property
       */
      prepare() {
        const e = new Te(this.Editor.UI.nodes.redactor);
        this._blocks = new Proxy(e, {
          set: Te.set,
          get: Te.get
        }), this.listeners.on(
          document,
          "copy",
          (t) => this.Editor.BlockEvents.handleCommandC(t)
        );
      }
      /**
       * Toggle read-only state
       *
       * If readOnly is true:
       *  - Unbind event handlers from created Blocks
       *
       * if readOnly is false:
       *  - Bind event handlers to all existing Blocks
       *
       * @param {boolean} readOnlyEnabled - "read only" state
       */
      toggleReadOnly(e) {
        e ? this.disableModuleBindings() : this.enableModuleBindings();
      }
      /**
       * Creates Block instance by tool name
       *
       * @param {object} options - block creation options
       * @param {string} options.tool - tools passed in editor config {@link EditorConfig#tools}
       * @param {string} [options.id] - unique id for this block
       * @param {BlockToolData} [options.data] - constructor params
       * @returns {Block}
       */
      composeBlock({
        tool: e,
        data: t = {},
        id: o = void 0,
        tunes: i = {}
      }) {
        const n = this.Editor.ReadOnly.isEnabled, r = this.Editor.Tools.blockTools.get(e), a = new F({
          id: o,
          data: t,
          tool: r,
          api: this.Editor.API,
          readOnly: n,
          tunesData: i
        }, this.eventsDispatcher);
        return n || window.requestIdleCallback(() => {
          this.bindBlockEvents(a);
        }, { timeout: 2e3 }), a;
      }
      /**
       * Insert new block into _blocks
       *
       * @param {object} options - insert options
       * @param {string} [options.id] - block's unique id
       * @param {string} [options.tool] - plugin name, by default method inserts the default block type
       * @param {object} [options.data] - plugin data
       * @param {number} [options.index] - index where to insert new Block
       * @param {boolean} [options.needToFocus] - flag shows if needed to update current Block index
       * @param {boolean} [options.replace] - flag shows if block by passed index should be replaced with inserted one
       * @returns {Block}
       */
      insert({
        id: e = void 0,
        tool: t = this.config.defaultBlock,
        data: o = {},
        index: i,
        needToFocus: n = !0,
        replace: r = !1,
        tunes: a = {}
      } = {}) {
        let l = i;
        l === void 0 && (l = this.currentBlockIndex + (r ? 0 : 1));
        const c = this.composeBlock({
          id: e,
          tool: t,
          data: o,
          tunes: a
        });
        return r && this.blockDidMutated(et, this.getBlockByIndex(l), {
          index: l
        }), this._blocks.insert(l, c, r), this.blockDidMutated(tt, c, {
          index: l
        }), n ? this.currentBlockIndex = l : l <= this.currentBlockIndex && this.currentBlockIndex++, c;
      }
      /**
       * Inserts several blocks at once
       *
       * @param blocks - blocks to insert
       * @param index - index where to insert
       */
      insertMany(e, t = 0) {
        this._blocks.insertMany(e, t);
      }
      /**
       * Update Block data.
       *
       * Currently we don't have an 'update' method in the Tools API, so we just create a new block with the same id and type
       * Should not trigger 'block-removed' or 'block-added' events
       *
       * @param block - block to update
       * @param data - new data
       */
      async update(e, t) {
        const o = await e.data, i = this.composeBlock({
          id: e.id,
          tool: e.name,
          data: Object.assign({}, o, t),
          tunes: e.tunes
        }), n = this.getBlockIndex(e);
        return this._blocks.replace(n, i), this.blockDidMutated(ot, i, {
          index: n
        }), i;
      }
      /**
       * Replace passed Block with the new one with specified Tool and data
       *
       * @param block - block to replace
       * @param newTool - new Tool name
       * @param data - new Tool data
       */
      replace(e, t, o) {
        const i = this.getBlockIndex(e);
        this.insert({
          tool: t,
          data: o,
          index: i,
          replace: !0
        });
      }
      /**
       * Insert pasted content. Call onPaste callback after insert.
       *
       * @param {string} toolName - name of Tool to insert
       * @param {PasteEvent} pasteEvent - pasted data
       * @param {boolean} replace - should replace current block
       */
      paste(e, t, o = !1) {
        const i = this.insert({
          tool: e,
          replace: o
        });
        try {
          window.requestIdleCallback(() => {
            i.call(q.ON_PASTE, t);
          });
        } catch (n) {
          L(`${e}: onPaste callback call is failed`, "error", n);
        }
        return i;
      }
      /**
       * Insert new default block at passed index
       *
       * @param {number} index - index where Block should be inserted
       * @param {boolean} needToFocus - if true, updates current Block index
       *
       * TODO: Remove method and use insert() with index instead (?)
       * @returns {Block} inserted Block
       */
      insertDefaultBlockAtIndex(e, t = !1) {
        const o = this.composeBlock({ tool: this.config.defaultBlock });
        return this._blocks[e] = o, this.blockDidMutated(tt, o, {
          index: e
        }), t ? this.currentBlockIndex = e : e <= this.currentBlockIndex && this.currentBlockIndex++, o;
      }
      /**
       * Always inserts at the end
       *
       * @returns {Block}
       */
      insertAtEnd() {
        return this.currentBlockIndex = this.blocks.length - 1, this.insert();
      }
      /**
       * Merge two blocks
       *
       * @param {Block} targetBlock - previous block will be append to this block
       * @param {Block} blockToMerge - block that will be merged with target block
       * @returns {Promise} - the sequence that can be continued
       */
      async mergeBlocks(e, t) {
        const o = await t.data;
        V(o) || await e.mergeWith(o), this.removeBlock(t), this.currentBlockIndex = this._blocks.indexOf(e);
      }
      /**
       * Remove passed Block
       *
       * @param block - Block to remove
       * @param addLastBlock - if true, adds new default block at the end. @todo remove this logic and use event-bus instead
       */
      removeBlock(e, t = !0) {
        return new Promise((o) => {
          const i = this._blocks.indexOf(e);
          if (!this.validateIndex(i))
            throw new Error("Can't find a Block to remove");
          e.destroy(), this._blocks.remove(i), this.blockDidMutated(et, e, {
            index: i
          }), this.currentBlockIndex >= i && this.currentBlockIndex--, this.blocks.length ? i === 0 && (this.currentBlockIndex = 0) : (this.currentBlockIndex = -1, t && this.insert()), o();
        });
      }
      /**
       * Remove only selected Blocks
       * and returns first Block index where started removing...
       *
       * @returns {number|undefined}
       */
      removeSelectedBlocks() {
        let e;
        for (let t = this.blocks.length - 1; t >= 0; t--)
          this.blocks[t].selected && (this.removeBlock(this.blocks[t]), e = t);
        return e;
      }
      /**
       * Attention!
       * After removing insert the new default typed Block and focus on it
       * Removes all blocks
       */
      removeAllBlocks() {
        for (let e = this.blocks.length - 1; e >= 0; e--)
          this._blocks.remove(e);
        this.currentBlockIndex = -1, this.insert(), this.currentBlock.firstInput.focus();
      }
      /**
       * Split current Block
       * 1. Extract content from Caret position to the Block`s end
       * 2. Insert a new Block below current one with extracted content
       *
       * @returns {Block}
       */
      split() {
        const e = this.Editor.Caret.extractFragmentFromCaretPosition(), t = d.make("div");
        t.appendChild(e);
        const o = {
          text: d.isEmpty(t) ? "" : t.innerHTML
        };
        return this.insert({ data: o });
      }
      /**
       * Returns Block by passed index
       *
       * @param {number} index - index to get. -1 to get last
       * @returns {Block}
       */
      getBlockByIndex(e) {
        return e === -1 && (e = this._blocks.length - 1), this._blocks[e];
      }
      /**
       * Returns an index for passed Block
       *
       * @param block - block to find index
       */
      getBlockIndex(e) {
        return this._blocks.indexOf(e);
      }
      /**
       * Returns the Block by passed id
       *
       * @param id - id of block to get
       * @returns {Block}
       */
      getBlockById(e) {
        return this._blocks.array.find((t) => t.id === e);
      }
      /**
       * Get Block instance by html element
       *
       * @param {Node} element - html element to get Block by
       */
      getBlock(e) {
        d.isElement(e) || (e = e.parentNode);
        const t = this._blocks.nodes, o = e.closest(`.${F.CSS.wrapper}`), i = t.indexOf(o);
        if (i >= 0)
          return this._blocks[i];
      }
      /**
       * Remove selection from all Blocks then highlight only Current Block
       */
      highlightCurrentNode() {
        this.clearFocused(), this.currentBlock.focused = !0;
      }
      /**
       * Remove selection from all Blocks
       */
      clearFocused() {
        this.blocks.forEach((e) => {
          e.focused = !1;
        });
      }
      /**
       * 1) Find first-level Block from passed child Node
       * 2) Mark it as current
       *
       * @param {Node} childNode - look ahead from this node.
       * @returns {Block | undefined} can return undefined in case when the passed child note is not a part of the current editor instance
       */
      setCurrentBlockByChildNode(e) {
        d.isElement(e) || (e = e.parentNode);
        const t = e.closest(`.${F.CSS.wrapper}`);
        if (!t)
          return;
        const o = t.closest(`.${this.Editor.UI.CSS.editorWrapper}`);
        if (o != null && o.isEqualNode(this.Editor.UI.nodes.wrapper))
          return this.currentBlockIndex = this._blocks.nodes.indexOf(t), this.currentBlock.updateCurrentInput(), this.currentBlock;
      }
      /**
       * Return block which contents passed node
       *
       * @param {Node} childNode - node to get Block by
       * @returns {Block}
       */
      getBlockByChildNode(e) {
        d.isElement(e) || (e = e.parentNode);
        const t = e.closest(`.${F.CSS.wrapper}`);
        return this.blocks.find((o) => o.holder === t);
      }
      /**
       * Swap Blocks Position
       *
       * @param {number} fromIndex - index of first block
       * @param {number} toIndex - index of second block
       * @deprecated — use 'move' instead
       */
      swap(e, t) {
        this._blocks.swap(e, t), this.currentBlockIndex = t;
      }
      /**
       * Move a block to a new index
       *
       * @param {number} toIndex - index where to move Block
       * @param {number} fromIndex - index of Block to move
       */
      move(e, t = this.currentBlockIndex) {
        if (isNaN(e) || isNaN(t)) {
          L("Warning during 'move' call: incorrect indices provided.", "warn");
          return;
        }
        if (!this.validateIndex(e) || !this.validateIndex(t)) {
          L("Warning during 'move' call: indices cannot be lower than 0 or greater than the amount of blocks.", "warn");
          return;
        }
        this._blocks.move(e, t), this.currentBlockIndex = e, this.blockDidMutated(qo, this.currentBlock, {
          fromIndex: t,
          toIndex: e
        });
      }
      /**
       * Converts passed Block to the new Tool
       * Uses Conversion Config
       *
       * @param blockToConvert - Block that should be converted
       * @param targetToolName - name of the Tool to convert to
       * @param blockDataOverrides - optional new Block data overrides
       */
      async convert(e, t, o) {
        if (!await e.save())
          throw new Error("Could not convert Block. Failed to extract original Block data.");
        const n = this.Editor.Tools.blockTools.get(t);
        if (!n)
          throw new Error(`Could not convert Block. Tool «${t}» not found.`);
        const r = await e.exportDataAsString(), a = Z(
          r,
          n.sanitizeConfig
        );
        let l = Jt(a, n.conversionConfig);
        o && (l = Object.assign(l, o)), this.replace(e, n.name, l);
      }
      /**
       * Sets current Block Index -1 which means unknown
       * and clear highlights
       */
      dropPointer() {
        this.currentBlockIndex = -1, this.clearFocused();
      }
      /**
       * Clears Editor
       *
       * @param {boolean} needToAddDefaultBlock - 1) in internal calls (for example, in api.blocks.render)
       *                                             we don't need to add an empty default block
       *                                        2) in api.blocks.clear we should add empty block
       */
      async clear(e = !1) {
        const t = new Zo();
        this.blocks.forEach((o) => {
          t.add(async () => {
            await this.removeBlock(o, !1);
          });
        }), await t.completed, this.dropPointer(), e && this.insert(), this.Editor.UI.checkEmptiness();
      }
      /**
       * Cleans up all the block tools' resources
       * This is called when editor is destroyed
       */
      async destroy() {
        await Promise.all(this.blocks.map((e) => e.destroy()));
      }
      /**
       * Bind Block events
       *
       * @param {Block} block - Block to which event should be bound
       */
      bindBlockEvents(e) {
        const { BlockEvents: t } = this.Editor;
        this.readOnlyMutableListeners.on(e.holder, "keydown", (o) => {
          t.keydown(o);
        }), this.readOnlyMutableListeners.on(e.holder, "keyup", (o) => {
          t.keyup(o);
        }), this.readOnlyMutableListeners.on(e.holder, "dragover", (o) => {
          t.dragOver(o);
        }), this.readOnlyMutableListeners.on(e.holder, "dragleave", (o) => {
          t.dragLeave(o);
        }), e.on("didMutated", (o) => this.blockDidMutated(ot, o, {
          index: this.getBlockIndex(o)
        }));
      }
      /**
       * Disable mutable handlers and bindings
       */
      disableModuleBindings() {
        this.readOnlyMutableListeners.clearAll();
      }
      /**
       * Enables all module handlers and bindings for all Blocks
       */
      enableModuleBindings() {
        this.readOnlyMutableListeners.on(
          document,
          "cut",
          (e) => this.Editor.BlockEvents.handleCommandX(e)
        ), this.blocks.forEach((e) => {
          this.bindBlockEvents(e);
        });
      }
      /**
       * Validates that the given index is not lower than 0 or higher than the amount of blocks
       *
       * @param {number} index - index of blocks array to validate
       * @returns {boolean}
       */
      validateIndex(e) {
        return !(e < 0 || e >= this._blocks.length);
      }
      /**
       * Block mutation callback
       *
       * @param mutationType - what happened with block
       * @param block - mutated block
       * @param detailData - additional data to pass with change event
       */
      blockDidMutated(e, t, o) {
        const i = new CustomEvent(e, {
          detail: {
            target: new ee(t),
            ...o
          }
        });
        return this.eventsDispatcher.emit(ct, {
          event: i
        }), t;
      }
    }
    class Jo extends C {
      constructor() {
        super(...arguments), this.anyBlockSelectedCache = null, this.needToSelectAll = !1, this.nativeInputSelected = !1, this.readyToBlockSelection = !1;
      }
      /**
       * Sanitizer Config
       *
       * @returns {SanitizerConfig}
       */
      get sanitizerConfig() {
        return {
          p: {},
          h1: {},
          h2: {},
          h3: {},
          h4: {},
          h5: {},
          h6: {},
          ol: {},
          ul: {},
          li: {},
          br: !0,
          img: {
            src: !0,
            width: !0,
            height: !0
          },
          a: {
            href: !0
          },
          b: {},
          i: {},
          u: {}
        };
      }
      /**
       * Flag that identifies all Blocks selection
       *
       * @returns {boolean}
       */
      get allBlocksSelected() {
        const { BlockManager: e } = this.Editor;
        return e.blocks.every((t) => t.selected === !0);
      }
      /**
       * Set selected all blocks
       *
       * @param {boolean} state - state to set
       */
      set allBlocksSelected(e) {
        const { BlockManager: t } = this.Editor;
        t.blocks.forEach((o) => {
          o.selected = e;
        }), this.clearCache();
      }
      /**
       * Flag that identifies any Block selection
       *
       * @returns {boolean}
       */
      get anyBlockSelected() {
        const { BlockManager: e } = this.Editor;
        return this.anyBlockSelectedCache === null && (this.anyBlockSelectedCache = e.blocks.some((t) => t.selected === !0)), this.anyBlockSelectedCache;
      }
      /**
       * Return selected Blocks array
       *
       * @returns {Block[]}
       */
      get selectedBlocks() {
        return this.Editor.BlockManager.blocks.filter((e) => e.selected);
      }
      /**
       * Module Preparation
       * Registers Shortcuts CMD+A and CMD+C
       * to select all and copy them
       */
      prepare() {
        this.selection = new m(), le.add({
          name: "CMD+A",
          handler: (e) => {
            const { BlockManager: t, ReadOnly: o } = this.Editor;
            if (o.isEnabled) {
              e.preventDefault(), this.selectAllBlocks();
              return;
            }
            t.currentBlock && this.handleCommandA(e);
          },
          on: this.Editor.UI.nodes.redactor
        });
      }
      /**
       * Toggle read-only state
       *
       *  - Remove all ranges
       *  - Unselect all Blocks
       */
      toggleReadOnly() {
        m.get().removeAllRanges(), this.allBlocksSelected = !1;
      }
      /**
       * Remove selection of Block
       *
       * @param {number?} index - Block index according to the BlockManager's indexes
       */
      unSelectBlockByIndex(e) {
        const { BlockManager: t } = this.Editor;
        let o;
        isNaN(e) ? o = t.currentBlock : o = t.getBlockByIndex(e), o.selected = !1, this.clearCache();
      }
      /**
       * Clear selection from Blocks
       *
       * @param {Event} reason - event caused clear of selection
       * @param {boolean} restoreSelection - if true, restore saved selection
       */
      clearSelection(e, t = !1) {
        const { BlockManager: o, Caret: i, RectangleSelection: n } = this.Editor;
        this.needToSelectAll = !1, this.nativeInputSelected = !1, this.readyToBlockSelection = !1;
        const r = e && e instanceof KeyboardEvent, a = r && nt(e.keyCode);
        if (this.anyBlockSelected && r && a && !m.isSelectionExists) {
          const l = o.removeSelectedBlocks();
          o.insertDefaultBlockAtIndex(l, !0), i.setToBlock(o.currentBlock), re(() => {
            const c = e.key;
            i.insertContentAtCaretPosition(c.length > 1 ? "" : c);
          }, 20)();
        }
        if (this.Editor.CrossBlockSelection.clear(e), !this.anyBlockSelected || n.isRectActivated()) {
          this.Editor.RectangleSelection.clearSelection();
          return;
        }
        t && this.selection.restore(), this.allBlocksSelected = !1;
      }
      /**
       * Reduce each Block and copy its content
       *
       * @param {ClipboardEvent} e - copy/cut event
       * @returns {Promise<void>}
       */
      copySelectedBlocks(e) {
        e.preventDefault();
        const t = d.make("div");
        this.selectedBlocks.forEach((n) => {
          const r = Z(n.holder.innerHTML, this.sanitizerConfig), a = d.make("p");
          a.innerHTML = r, t.appendChild(a);
        });
        const o = Array.from(t.childNodes).map((n) => n.textContent).join(`

`), i = t.innerHTML;
        return e.clipboardData.setData("text/plain", o), e.clipboardData.setData("text/html", i), Promise.all(this.selectedBlocks.map((n) => n.save())).then((n) => {
          try {
            e.clipboardData.setData(this.Editor.Paste.MIME_TYPE, JSON.stringify(n));
          } catch {
          }
        });
      }
      /**
       * select Block
       *
       * @param {number?} index - Block index according to the BlockManager's indexes
       */
      selectBlockByIndex(e) {
        const { BlockManager: t } = this.Editor;
        t.clearFocused();
        let o;
        isNaN(e) ? o = t.currentBlock : o = t.getBlockByIndex(e), this.selection.save(), m.get().removeAllRanges(), o.selected = !0, this.clearCache(), this.Editor.InlineToolbar.close();
      }
      /**
       * Clear anyBlockSelected cache
       */
      clearCache() {
        this.anyBlockSelectedCache = null;
      }
      /**
       * Module destruction
       * De-registers Shortcut CMD+A
       */
      destroy() {
        le.remove(this.Editor.UI.nodes.redactor, "CMD+A");
      }
      /**
       * First CMD+A selects all input content by native behaviour,
       * next CMD+A keypress selects all blocks
       *
       * @param {KeyboardEvent} event - keyboard event
       */
      handleCommandA(e) {
        if (this.Editor.RectangleSelection.clearSelection(), d.isNativeInput(e.target) && !this.readyToBlockSelection) {
          this.readyToBlockSelection = !0;
          return;
        }
        const o = this.Editor.BlockManager.getBlock(e.target).inputs;
        if (o.length > 1 && !this.readyToBlockSelection) {
          this.readyToBlockSelection = !0;
          return;
        }
        if (o.length === 1 && !this.needToSelectAll) {
          this.needToSelectAll = !0;
          return;
        }
        this.needToSelectAll ? (e.preventDefault(), this.selectAllBlocks(), this.needToSelectAll = !1, this.readyToBlockSelection = !1, this.Editor.ConversionToolbar.close()) : this.readyToBlockSelection && (e.preventDefault(), this.selectBlockByIndex(), this.needToSelectAll = !0);
      }
      /**
       * Select All Blocks
       * Each Block has selected setter that makes Block copyable
       */
      selectAllBlocks() {
        this.selection.save(), m.get().removeAllRanges(), this.allBlocksSelected = !0, this.Editor.InlineToolbar.close();
      }
    }
    class ve extends C {
      /**
       * Allowed caret positions in input
       *
       * @static
       * @returns {{START: string, END: string, DEFAULT: string}}
       */
      get positions() {
        return {
          START: "start",
          END: "end",
          DEFAULT: "default"
        };
      }
      /**
       * Elements styles that can be useful for Caret Module
       */
      static get CSS() {
        return {
          shadowCaret: "cdx-shadow-caret"
        };
      }
      /**
       * Get's deepest first node and checks if offset is zero
       *
       * @returns {boolean}
       */
      get isAtStart() {
        const e = m.get(), t = d.getDeepestNode(this.Editor.BlockManager.currentBlock.currentInput);
        let o = e.focusNode;
        if (d.isNativeInput(t))
          return t.selectionEnd === 0;
        if (!e.anchorNode)
          return !1;
        let i = o.textContent.search(/\S/);
        i === -1 && (i = 0);
        let n = e.focusOffset;
        return o.nodeType !== Node.TEXT_NODE && o.childNodes.length && (o.childNodes[n] ? (o = o.childNodes[n], n = 0) : (o = o.childNodes[n - 1], n = o.textContent.length)), (d.isLineBreakTag(t) || d.isEmpty(t)) && this.getHigherLevelSiblings(o, "left").every((l) => {
          const c = d.isLineBreakTag(l), u = l.children.length === 1 && d.isLineBreakTag(l.children[0]), h = c || u;
          return d.isEmpty(l) && !h;
        }) && n === i ? !0 : t === null || o === t && n <= i;
      }
      /**
       * Get's deepest last node and checks if offset is last node text length
       *
       * @returns {boolean}
       */
      get isAtEnd() {
        const e = m.get();
        let t = e.focusNode;
        const o = d.getDeepestNode(this.Editor.BlockManager.currentBlock.currentInput, !0);
        if (d.isNativeInput(o))
          return o.selectionEnd === o.value.length;
        if (!e.focusNode)
          return !1;
        let i = e.focusOffset;
        if (t.nodeType !== Node.TEXT_NODE && t.childNodes.length && (t.childNodes[i - 1] ? (t = t.childNodes[i - 1], i = t.textContent.length) : (t = t.childNodes[0], i = 0)), d.isLineBreakTag(o) || d.isEmpty(o)) {
          const r = this.getHigherLevelSiblings(t, "right");
          if (r.every((l, c) => c === r.length - 1 && d.isLineBreakTag(l) || d.isEmpty(l) && !d.isLineBreakTag(l)) && i === t.textContent.length)
            return !0;
        }
        const n = o.textContent.replace(/\s+$/, "");
        return t === o && i >= n.length;
      }
      /**
       * Method gets Block instance and puts caret to the text node with offset
       * There two ways that method applies caret position:
       *   - first found text node: sets at the beginning, but you can pass an offset
       *   - last found text node: sets at the end of the node. Also, you can customize the behaviour
       *
       * @param {Block} block - Block class
       * @param {string} position - position where to set caret.
       *                            If default - leave default behaviour and apply offset if it's passed
       * @param {number} offset - caret offset regarding to the text node
       */
      setToBlock(e, t = this.positions.DEFAULT, o = 0) {
        const { BlockManager: i } = this.Editor;
        let n;
        switch (t) {
          case this.positions.START:
            n = e.firstInput;
            break;
          case this.positions.END:
            n = e.lastInput;
            break;
          default:
            n = e.currentInput;
        }
        if (!n)
          return;
        const r = d.getDeepestNode(n, t === this.positions.END), a = d.getContentLength(r);
        switch (!0) {
          case t === this.positions.START:
            o = 0;
            break;
          case t === this.positions.END:
          case o > a:
            o = a;
            break;
        }
        re(() => {
          this.set(r, o);
        }, 20)(), i.setCurrentBlockByChildNode(e.holder), i.currentBlock.currentInput = n;
      }
      /**
       * Set caret to the current input of current Block.
       *
       * @param {HTMLElement} input - input where caret should be set
       * @param {string} position - position of the caret.
       *                            If default - leave default behaviour and apply offset if it's passed
       * @param {number} offset - caret offset regarding to the text node
       */
      setToInput(e, t = this.positions.DEFAULT, o = 0) {
        const { currentBlock: i } = this.Editor.BlockManager, n = d.getDeepestNode(e);
        switch (t) {
          case this.positions.START:
            this.set(n, 0);
            break;
          case this.positions.END:
            this.set(n, d.getContentLength(n));
            break;
          default:
            o && this.set(n, o);
        }
        i.currentInput = e;
      }
      /**
       * Creates Document Range and sets caret to the element with offset
       *
       * @param {HTMLElement} element - target node.
       * @param {number} offset - offset
       */
      set(e, t = 0) {
        const { top: o, bottom: i } = m.setCursor(e, t), { innerHeight: n } = window;
        o < 0 && window.scrollBy(0, o), i > n && window.scrollBy(0, i - n);
      }
      /**
       * Set Caret to the last Block
       * If last block is not empty, append another empty block
       */
      setToTheLastBlock() {
        const e = this.Editor.BlockManager.lastBlock;
        if (e)
          if (e.tool.isDefault && e.isEmpty)
            this.setToBlock(e);
          else {
            const t = this.Editor.BlockManager.insertAtEnd();
            this.setToBlock(t);
          }
      }
      /**
       * Extract content fragment of current Block from Caret position to the end of the Block
       */
      extractFragmentFromCaretPosition() {
        const e = m.get();
        if (e.rangeCount) {
          const t = e.getRangeAt(0), o = this.Editor.BlockManager.currentBlock.currentInput;
          if (t.deleteContents(), o)
            if (d.isNativeInput(o)) {
              const i = o, n = document.createDocumentFragment(), r = i.value.substring(0, i.selectionStart), a = i.value.substring(i.selectionStart);
              return n.textContent = a, i.value = r, n;
            } else {
              const i = t.cloneRange();
              return i.selectNodeContents(o), i.setStart(t.endContainer, t.endOffset), i.extractContents();
            }
        }
      }
      /**
       * Set's caret to the next Block or Tool`s input
       * Before moving caret, we should check if caret position is at the end of Plugins node
       * Using {@link Dom#getDeepestNode} to get a last node and match with current selection
       *
       * @returns {boolean}
       */
      navigateNext() {
        const { BlockManager: e } = this.Editor, { currentBlock: t, nextContentfulBlock: o } = e, { nextInput: i } = t, n = this.isAtEnd;
        let r = o;
        if (!r && !i) {
          if (t.tool.isDefault || !n)
            return !1;
          r = e.insertAtEnd();
        }
        return n ? (i ? this.setToInput(i, this.positions.START) : this.setToBlock(r, this.positions.START), !0) : !1;
      }
      /**
       * Set's caret to the previous Tool`s input or Block
       * Before moving caret, we should check if caret position is start of the Plugins node
       * Using {@link Dom#getDeepestNode} to get a last node and match with current selection
       *
       * @returns {boolean}
       */
      navigatePrevious() {
        const { currentBlock: e, previousContentfulBlock: t } = this.Editor.BlockManager;
        if (!e)
          return !1;
        const { previousInput: o } = e;
        return !t && !o ? !1 : this.isAtStart ? (o ? this.setToInput(o, this.positions.END) : this.setToBlock(t, this.positions.END), !0) : !1;
      }
      /**
       * Inserts shadow element after passed element where caret can be placed
       *
       * @param {Element} element - element after which shadow caret should be inserted
       */
      createShadow(e) {
        const t = document.createElement("span");
        t.classList.add(ve.CSS.shadowCaret), e.insertAdjacentElement("beforeend", t);
      }
      /**
       * Restores caret position
       *
       * @param {HTMLElement} element - element where caret should be restored
       */
      restoreCaret(e) {
        const t = e.querySelector(`.${ve.CSS.shadowCaret}`);
        if (!t)
          return;
        new m().expandToTag(t);
        const i = document.createRange();
        i.selectNode(t), i.extractContents();
      }
      /**
       * Inserts passed content at caret position
       *
       * @param {string} content - content to insert
       */
      insertContentAtCaretPosition(e) {
        const t = document.createDocumentFragment(), o = document.createElement("div"), i = m.get(), n = m.range;
        o.innerHTML = e, Array.from(o.childNodes).forEach((c) => t.appendChild(c)), t.childNodes.length === 0 && t.appendChild(new Text());
        const r = t.lastChild;
        n.deleteContents(), n.insertNode(t);
        const a = document.createRange(), l = r.nodeType === Node.TEXT_NODE ? r : r.firstChild;
        l !== null && l.textContent !== null && a.setStart(l, l.textContent.length), i.removeAllRanges(), i.addRange(a);
      }
      /**
       * Get all first-level (first child of [contenteditable]) siblings from passed node
       * Then you can check it for emptiness
       *
       * @example
       * <div contenteditable>
       * <p></p>                            |
       * <p></p>                            | left first-level siblings
       * <p></p>                            |
       * <blockquote><a><b>adaddad</b><a><blockquote>       <-- passed node for example <b>
       * <p></p>                            |
       * <p></p>                            | right first-level siblings
       * <p></p>                            |
       * </div>
       * @param {HTMLElement} from - element from which siblings should be searched
       * @param {'left' | 'right'} direction - direction of search
       * @returns {HTMLElement[]}
       */
      getHigherLevelSiblings(e, t) {
        let o = e;
        const i = [];
        for (; o.parentNode && o.parentNode.contentEditable !== "true"; )
          o = o.parentNode;
        const n = t === "left" ? "previousSibling" : "nextSibling";
        for (; o[n]; )
          o = o[n], i.push(o);
        return i;
      }
    }
    class Qo extends C {
      constructor() {
        super(...arguments), this.onMouseUp = () => {
          this.listeners.off(document, "mouseover", this.onMouseOver), this.listeners.off(document, "mouseup", this.onMouseUp);
        }, this.onMouseOver = (e) => {
          const { BlockManager: t, BlockSelection: o } = this.Editor, i = t.getBlockByChildNode(e.relatedTarget) || this.lastSelectedBlock, n = t.getBlockByChildNode(e.target);
          if (!(!i || !n) && n !== i) {
            if (i === this.firstSelectedBlock) {
              m.get().removeAllRanges(), i.selected = !0, n.selected = !0, o.clearCache();
              return;
            }
            if (n === this.firstSelectedBlock) {
              i.selected = !1, n.selected = !1, o.clearCache();
              return;
            }
            this.Editor.InlineToolbar.close(), this.toggleBlocksSelectedState(i, n), this.lastSelectedBlock = n;
          }
        };
      }
      /**
       * Module preparation
       *
       * @returns {Promise}
       */
      async prepare() {
        this.listeners.on(document, "mousedown", (e) => {
          this.enableCrossBlockSelection(e);
        });
      }
      /**
       * Sets up listeners
       *
       * @param {MouseEvent} event - mouse down event
       */
      watchSelection(e) {
        if (e.button !== _t.LEFT)
          return;
        const { BlockManager: t } = this.Editor;
        this.firstSelectedBlock = t.getBlock(e.target), this.lastSelectedBlock = this.firstSelectedBlock, this.listeners.on(document, "mouseover", this.onMouseOver), this.listeners.on(document, "mouseup", this.onMouseUp);
      }
      /**
       * return boolean is cross block selection started
       */
      get isCrossBlockSelectionStarted() {
        return !!this.firstSelectedBlock && !!this.lastSelectedBlock;
      }
      /**
       * Change selection state of the next Block
       * Used for CBS via Shift + arrow keys
       *
       * @param {boolean} next - if true, toggle next block. Previous otherwise
       */
      toggleBlockSelectedState(e = !0) {
        const { BlockManager: t, BlockSelection: o } = this.Editor;
        this.lastSelectedBlock || (this.lastSelectedBlock = this.firstSelectedBlock = t.currentBlock), this.firstSelectedBlock === this.lastSelectedBlock && (this.firstSelectedBlock.selected = !0, o.clearCache(), m.get().removeAllRanges());
        const i = t.blocks.indexOf(this.lastSelectedBlock) + (e ? 1 : -1), n = t.blocks[i];
        n && (this.lastSelectedBlock.selected !== n.selected ? (n.selected = !0, o.clearCache()) : (this.lastSelectedBlock.selected = !1, o.clearCache()), this.lastSelectedBlock = n, this.Editor.InlineToolbar.close(), n.holder.scrollIntoView({
          block: "nearest"
        }));
      }
      /**
       * Clear saved state
       *
       * @param {Event} reason - event caused clear of selection
       */
      clear(e) {
        const { BlockManager: t, BlockSelection: o, Caret: i } = this.Editor, n = t.blocks.indexOf(this.firstSelectedBlock), r = t.blocks.indexOf(this.lastSelectedBlock);
        if (o.anyBlockSelected && n > -1 && r > -1)
          if (e && e instanceof KeyboardEvent)
            switch (e.keyCode) {
              case B.DOWN:
              case B.RIGHT:
                i.setToBlock(t.blocks[Math.max(n, r)], i.positions.END);
                break;
              case B.UP:
              case B.LEFT:
                i.setToBlock(t.blocks[Math.min(n, r)], i.positions.START);
                break;
              default:
                i.setToBlock(t.blocks[Math.max(n, r)], i.positions.END);
            }
          else
            i.setToBlock(t.blocks[Math.max(n, r)], i.positions.END);
        this.firstSelectedBlock = this.lastSelectedBlock = null;
      }
      /**
       * Enables Cross Block Selection
       *
       * @param {MouseEvent} event - mouse down event
       */
      enableCrossBlockSelection(e) {
        const { UI: t } = this.Editor;
        m.isCollapsed || this.Editor.BlockSelection.clearSelection(e), t.nodes.redactor.contains(e.target) ? this.watchSelection(e) : this.Editor.BlockSelection.clearSelection(e);
      }
      /**
       * Change blocks selection state between passed two blocks.
       *
       * @param {Block} firstBlock - first block in range
       * @param {Block} lastBlock - last block in range
       */
      toggleBlocksSelectedState(e, t) {
        const { BlockManager: o, BlockSelection: i } = this.Editor, n = o.blocks.indexOf(e), r = o.blocks.indexOf(t), a = e.selected !== t.selected;
        for (let l = Math.min(n, r); l <= Math.max(n, r); l++) {
          const c = o.blocks[l];
          c !== this.firstSelectedBlock && c !== (a ? e : t) && (o.blocks[l].selected = !o.blocks[l].selected, i.clearCache());
        }
      }
    }
    class ei extends C {
      constructor() {
        super(...arguments), this.isStartedAtEditor = !1;
      }
      /**
       * Toggle read-only state
       *
       * if state is true:
       *  - disable all drag-n-drop event handlers
       *
       * if state is false:
       *  - restore drag-n-drop event handlers
       *
       * @param {boolean} readOnlyEnabled - "read only" state
       */
      toggleReadOnly(e) {
        e ? this.disableModuleBindings() : this.enableModuleBindings();
      }
      /**
       * Add drag events listeners to editor zone
       */
      enableModuleBindings() {
        const { UI: e } = this.Editor;
        this.readOnlyMutableListeners.on(e.nodes.holder, "drop", async (t) => {
          await this.processDrop(t);
        }, !0), this.readOnlyMutableListeners.on(e.nodes.holder, "dragstart", () => {
          this.processDragStart();
        }), this.readOnlyMutableListeners.on(e.nodes.holder, "dragover", (t) => {
          this.processDragOver(t);
        }, !0);
      }
      /**
       * Unbind drag-n-drop event handlers
       */
      disableModuleBindings() {
        this.readOnlyMutableListeners.clearAll();
      }
      /**
       * Handle drop event
       *
       * @param {DragEvent} dropEvent - drop event
       */
      async processDrop(e) {
        const {
          BlockManager: t,
          Caret: o,
          Paste: i
        } = this.Editor;
        e.preventDefault(), t.blocks.forEach((r) => {
          r.dropTarget = !1;
        }), m.isAtEditor && !m.isCollapsed && this.isStartedAtEditor && document.execCommand("delete"), this.isStartedAtEditor = !1;
        const n = t.setCurrentBlockByChildNode(e.target);
        if (n)
          this.Editor.Caret.setToBlock(n, o.positions.END);
        else {
          const r = t.setCurrentBlockByChildNode(t.lastBlock.holder);
          this.Editor.Caret.setToBlock(r, o.positions.END);
        }
        await i.processDataTransfer(e.dataTransfer, !0);
      }
      /**
       * Handle drag start event
       */
      processDragStart() {
        m.isAtEditor && !m.isCollapsed && (this.isStartedAtEditor = !0), this.Editor.InlineToolbar.close();
      }
      /**
       * @param {DragEvent} dragEvent - drag event
       */
      processDragOver(e) {
        e.preventDefault();
      }
    }
    class ti extends C {
      /**
       * Prepare the module
       *
       * @param options - options used by the modification observer module
       * @param options.config - Editor configuration object
       * @param options.eventsDispatcher - common Editor event bus
       */
      constructor({ config: e, eventsDispatcher: t }) {
        super({
          config: e,
          eventsDispatcher: t
        }), this.disabled = !1, this.batchingTimeout = null, this.batchingOnChangeQueue = /* @__PURE__ */ new Map(), this.batchTime = 400, this.mutationObserver = new MutationObserver((o) => {
          this.redactorChanged(o);
        }), this.eventsDispatcher.on(ct, (o) => {
          this.particularBlockChanged(o.event);
        }), this.eventsDispatcher.on(dt, () => {
          this.disable();
        }), this.eventsDispatcher.on(ht, () => {
          this.enable();
        });
      }
      /**
       * Enables onChange event
       */
      enable() {
        this.mutationObserver.observe(
          this.Editor.UI.nodes.redactor,
          {
            childList: !0,
            subtree: !0,
            characterData: !0,
            attributes: !0
          }
        ), this.disabled = !1;
      }
      /**
       * Disables onChange event
       */
      disable() {
        this.mutationObserver.disconnect(), this.disabled = !0;
      }
      /**
       * Call onChange event passed to Editor.js configuration
       *
       * @param event - some of our custom change events
       */
      particularBlockChanged(e) {
        this.disabled || !D(this.config.onChange) || (this.batchingOnChangeQueue.set(`block:${e.detail.target.id}:event:${e.type}`, e), this.batchingTimeout && clearTimeout(this.batchingTimeout), this.batchingTimeout = setTimeout(() => {
          let t;
          this.batchingOnChangeQueue.size === 1 ? t = this.batchingOnChangeQueue.values().next().value : t = Array.from(this.batchingOnChangeQueue.values()), this.config.onChange && this.config.onChange(this.Editor.API.methods, t), this.batchingOnChangeQueue.clear();
        }, this.batchTime));
      }
      /**
       * Fired on every blocks wrapper dom change
       *
       * @param mutations - mutations happened
       */
      redactorChanged(e) {
        this.eventsDispatcher.emit(Me, {
          mutations: e
        });
      }
    }
    const wt = class extends C {
      constructor() {
        super(...arguments), this.MIME_TYPE = "application/x-editor-js", this.toolsTags = {}, this.tagsByTool = {}, this.toolsPatterns = [], this.toolsFiles = {}, this.exceptionList = [], this.processTool = (s) => {
          try {
            const e = s.create({}, {}, !1);
            if (s.pasteConfig === !1) {
              this.exceptionList.push(s.name);
              return;
            }
            if (!D(e.onPaste))
              return;
            this.getTagsConfig(s), this.getFilesConfig(s), this.getPatternsConfig(s);
          } catch (e) {
            L(
              `Paste handling for «${s.name}» Tool hasn't been set up because of the error`,
              "warn",
              e
            );
          }
        }, this.handlePasteEvent = async (s) => {
          const { BlockManager: e, Toolbar: t } = this.Editor, o = e.setCurrentBlockByChildNode(s.target);
          !o || this.isNativeBehaviour(s.target) && !s.clipboardData.types.includes("Files") || o && this.exceptionList.includes(o.name) || (s.preventDefault(), this.processDataTransfer(s.clipboardData), e.clearFocused(), t.close());
        };
      }
      /**
       * Set onPaste callback and collect tools` paste configurations
       */
      async prepare() {
        this.processTools();
      }
      /**
       * Set read-only state
       *
       * @param {boolean} readOnlyEnabled - read only flag value
       */
      toggleReadOnly(s) {
        s ? this.unsetCallback() : this.setCallback();
      }
      /**
       * Handle pasted or dropped data transfer object
       *
       * @param {DataTransfer} dataTransfer - pasted or dropped data transfer object
       * @param {boolean} isDragNDrop - true if data transfer comes from drag'n'drop events
       */
      async processDataTransfer(s, e = !1) {
        const { Tools: t } = this.Editor, o = s.types;
        if ((o.includes ? o.includes("Files") : o.contains("Files")) && !V(this.toolsFiles)) {
          await this.processFiles(s.files);
          return;
        }
        const n = s.getData(this.MIME_TYPE), r = s.getData("text/plain");
        let a = s.getData("text/html");
        if (n)
          try {
            this.insertEditorJSData(JSON.parse(n));
            return;
          } catch {
          }
        e && r.trim() && a.trim() && (a = "<p>" + (a.trim() ? a : r) + "</p>");
        const l = Object.keys(this.toolsTags).reduce((h, f) => (h[f.toLowerCase()] = this.toolsTags[f].sanitizationConfig ?? {}, h), {}), c = Object.assign({}, l, t.getAllInlineToolsSanitizeConfig(), { br: {} }), u = Z(a, c);
        !u.trim() || u.trim() === r || !d.isHTMLString(u) ? await this.processText(r) : await this.processText(u, !0);
      }
      /**
       * Process pasted text and divide them into Blocks
       *
       * @param {string} data - text to process. Can be HTML or plain.
       * @param {boolean} isHTML - if passed string is HTML, this parameter should be true
       */
      async processText(s, e = !1) {
        const { Caret: t, BlockManager: o } = this.Editor, i = e ? this.processHTML(s) : this.processPlain(s);
        if (!i.length)
          return;
        if (i.length === 1) {
          i[0].isBlock ? this.processSingleBlock(i.pop()) : this.processInlinePaste(i.pop());
          return;
        }
        const r = o.currentBlock && o.currentBlock.tool.isDefault && o.currentBlock.isEmpty;
        i.map(
          async (a, l) => this.insertBlock(a, l === 0 && r)
        ), o.currentBlock && t.setToBlock(o.currentBlock, t.positions.END);
      }
      /**
       * Set onPaste callback handler
       */
      setCallback() {
        this.listeners.on(this.Editor.UI.nodes.holder, "paste", this.handlePasteEvent);
      }
      /**
       * Unset onPaste callback handler
       */
      unsetCallback() {
        this.listeners.off(this.Editor.UI.nodes.holder, "paste", this.handlePasteEvent);
      }
      /**
       * Get and process tool`s paste configs
       */
      processTools() {
        const s = this.Editor.Tools.blockTools;
        Array.from(s.values()).forEach(this.processTool);
      }
      /**
       * Get tags name list from either tag name or sanitization config.
       *
       * @param {string | object} tagOrSanitizeConfig - tag name or sanitize config object.
       * @returns {string[]} array of tags.
       */
      collectTagNames(s) {
        return J(s) ? [s] : z(s) ? Object.keys(s) : [];
      }
      /**
       * Get tags to substitute by Tool
       *
       * @param tool - BlockTool object
       */
      getTagsConfig(s) {
        if (s.pasteConfig === !1)
          return;
        const e = s.pasteConfig.tags || [], t = [];
        e.forEach((o) => {
          const i = this.collectTagNames(o);
          t.push(...i), i.forEach((n) => {
            if (Object.prototype.hasOwnProperty.call(this.toolsTags, n)) {
              L(
                `Paste handler for «${s.name}» Tool on «${n}» tag is skipped because it is already used by «${this.toolsTags[n].tool.name}» Tool.`,
                "warn"
              );
              return;
            }
            const r = z(o) ? o[n] : null;
            this.toolsTags[n.toUpperCase()] = {
              tool: s,
              sanitizationConfig: r
            };
          });
        }), this.tagsByTool[s.name] = t.map((o) => o.toUpperCase());
      }
      /**
       * Get files` types and extensions to substitute by Tool
       *
       * @param tool - BlockTool object
       */
      getFilesConfig(s) {
        if (s.pasteConfig === !1)
          return;
        const { files: e = {} } = s.pasteConfig;
        let { extensions: t, mimeTypes: o } = e;
        !t && !o || (t && !Array.isArray(t) && (L(`«extensions» property of the onDrop config for «${s.name}» Tool should be an array`), t = []), o && !Array.isArray(o) && (L(`«mimeTypes» property of the onDrop config for «${s.name}» Tool should be an array`), o = []), o && (o = o.filter((i) => Ft(i) ? !0 : (L(`MIME type value «${i}» for the «${s.name}» Tool is not a valid MIME type`, "warn"), !1))), this.toolsFiles[s.name] = {
          extensions: t || [],
          mimeTypes: o || []
        });
      }
      /**
       * Get RegExp patterns to substitute by Tool
       *
       * @param tool - BlockTool object
       */
      getPatternsConfig(s) {
        s.pasteConfig === !1 || !s.pasteConfig.patterns || V(s.pasteConfig.patterns) || Object.entries(s.pasteConfig.patterns).forEach(([e, t]) => {
          t instanceof RegExp || L(
            `Pattern ${t} for «${s.name}» Tool is skipped because it should be a Regexp instance.`,
            "warn"
          ), this.toolsPatterns.push({
            key: e,
            pattern: t,
            tool: s
          });
        });
      }
      /**
       * Check if browser behavior suits better
       *
       * @param {EventTarget} element - element where content has been pasted
       * @returns {boolean}
       */
      isNativeBehaviour(s) {
        return d.isNativeInput(s);
      }
      /**
       * Get files from data transfer object and insert related Tools
       *
       * @param {FileList} items - pasted or dropped items
       */
      async processFiles(s) {
        const { BlockManager: e } = this.Editor;
        let t;
        t = await Promise.all(
          Array.from(s).map((n) => this.processFile(n))
        ), t = t.filter((n) => !!n);
        const i = e.currentBlock.tool.isDefault && e.currentBlock.isEmpty;
        t.forEach(
          (n, r) => {
            e.paste(n.type, n.event, r === 0 && i);
          }
        );
      }
      /**
       * Get information about file and find Tool to handle it
       *
       * @param {File} file - file to process
       */
      async processFile(s) {
        const e = Pt(s), t = Object.entries(this.toolsFiles).find(([n, { mimeTypes: r, extensions: a }]) => {
          const [l, c] = s.type.split("/"), u = a.find((f) => f.toLowerCase() === e.toLowerCase()), h = r.find((f) => {
            const [k, p] = f.split("/");
            return k === l && (p === c || p === "*");
          });
          return !!u || !!h;
        });
        if (!t)
          return;
        const [o] = t;
        return {
          event: this.composePasteEvent("file", {
            file: s
          }),
          type: o
        };
      }
      /**
       * Split HTML string to blocks and return it as array of Block data
       *
       * @param {string} innerHTML - html string to process
       * @returns {PasteData[]}
       */
      processHTML(s) {
        const { Tools: e } = this.Editor, t = d.make("DIV");
        return t.innerHTML = s, this.getNodes(t).map((i) => {
          let n, r = e.defaultTool, a = !1;
          switch (i.nodeType) {
            case Node.DOCUMENT_FRAGMENT_NODE:
              n = d.make("div"), n.appendChild(i);
              break;
            case Node.ELEMENT_NODE:
              n = i, a = !0, this.toolsTags[n.tagName] && (r = this.toolsTags[n.tagName].tool);
              break;
          }
          const { tags: l } = r.pasteConfig || { tags: [] }, c = l.reduce((f, k) => (this.collectTagNames(k).forEach((v) => {
            const A = z(k) ? k[v] : null;
            f[v.toLowerCase()] = A || {};
          }), f), {}), u = Object.assign({}, c, r.baseSanitizeConfig);
          if (n.tagName.toLowerCase() === "table") {
            const f = Z(n.outerHTML, u);
            n = d.make("div", void 0, {
              innerHTML: f
            }).firstChild;
          } else
            n.innerHTML = Z(n.innerHTML, u);
          const h = this.composePasteEvent("tag", {
            data: n
          });
          return {
            content: n,
            isBlock: a,
            tool: r.name,
            event: h
          };
        }).filter((i) => {
          const n = d.isEmpty(i.content), r = d.isSingleTag(i.content);
          return !n || r;
        });
      }
      /**
       * Split plain text by new line symbols and return it as array of Block data
       *
       * @param {string} plain - string to process
       * @returns {PasteData[]}
       */
      processPlain(s) {
        const { defaultBlock: e } = this.config;
        if (!s)
          return [];
        const t = e;
        return s.split(/\r?\n/).filter((o) => o.trim()).map((o) => {
          const i = d.make("div");
          i.textContent = o;
          const n = this.composePasteEvent("tag", {
            data: i
          });
          return {
            content: i,
            tool: t,
            isBlock: !1,
            event: n
          };
        });
      }
      /**
       * Process paste of single Block tool content
       *
       * @param {PasteData} dataToInsert - data of Block to insert
       */
      async processSingleBlock(s) {
        const { Caret: e, BlockManager: t } = this.Editor, { currentBlock: o } = t;
        if (!o || s.tool !== o.name || !d.containsOnlyInlineElements(s.content.innerHTML)) {
          this.insertBlock(s, (o == null ? void 0 : o.tool.isDefault) && o.isEmpty);
          return;
        }
        e.insertContentAtCaretPosition(s.content.innerHTML);
      }
      /**
       * Process paste to single Block:
       * 1. Find patterns` matches
       * 2. Insert new block if it is not the same type as current one
       * 3. Just insert text if there is no substitutions
       *
       * @param {PasteData} dataToInsert - data of Block to insert
       */
      async processInlinePaste(s) {
        const { BlockManager: e, Caret: t } = this.Editor, { content: o } = s;
        if (e.currentBlock && e.currentBlock.tool.isDefault && o.textContent.length < wt.PATTERN_PROCESSING_MAX_LENGTH) {
          const n = await this.processPattern(o.textContent);
          if (n) {
            const r = e.currentBlock && e.currentBlock.tool.isDefault && e.currentBlock.isEmpty, a = e.paste(n.tool, n.event, r);
            t.setToBlock(a, t.positions.END);
            return;
          }
        }
        if (e.currentBlock && e.currentBlock.currentInput) {
          const n = e.currentBlock.tool.baseSanitizeConfig;
          document.execCommand(
            "insertHTML",
            !1,
            Z(o.innerHTML, n)
          );
        } else
          this.insertBlock(s);
      }
      /**
       * Get patterns` matches
       *
       * @param {string} text - text to process
       * @returns {Promise<{event: PasteEvent, tool: string}>}
       */
      async processPattern(s) {
        const e = this.toolsPatterns.find((o) => {
          const i = o.pattern.exec(s);
          return i ? s === i.shift() : !1;
        });
        return e ? {
          event: this.composePasteEvent("pattern", {
            key: e.key,
            data: s
          }),
          tool: e.tool.name
        } : void 0;
      }
      /**
       * Insert pasted Block content to Editor
       *
       * @param {PasteData} data - data to insert
       * @param {boolean} canReplaceCurrentBlock - if true and is current Block is empty, will replace current Block
       * @returns {void}
       */
      insertBlock(s, e = !1) {
        const { BlockManager: t, Caret: o } = this.Editor, { currentBlock: i } = t;
        let n;
        if (e && i && i.isEmpty) {
          n = t.paste(s.tool, s.event, !0), o.setToBlock(n, o.positions.END);
          return;
        }
        n = t.paste(s.tool, s.event), o.setToBlock(n, o.positions.END);
      }
      /**
       * Insert data passed as application/x-editor-js JSON
       *
       * @param {Array} blocks — Blocks' data to insert
       * @returns {void}
       */
      insertEditorJSData(s) {
        const { BlockManager: e, Caret: t, Tools: o } = this.Editor;
        ut(
          s,
          (n) => o.blockTools.get(n).sanitizeConfig
        ).forEach(({ tool: n, data: r }, a) => {
          let l = !1;
          a === 0 && (l = e.currentBlock && e.currentBlock.tool.isDefault && e.currentBlock.isEmpty);
          const c = e.insert({
            tool: n,
            data: r,
            replace: l
          });
          t.setToBlock(c, t.positions.END);
        });
      }
      /**
       * Fetch nodes from Element node
       *
       * @param {Node} node - current node
       * @param {Node[]} nodes - processed nodes
       * @param {Node} destNode - destination node
       */
      processElementNode(s, e, t) {
        const o = Object.keys(this.toolsTags), i = s, { tool: n } = this.toolsTags[i.tagName] || {}, r = this.tagsByTool[n == null ? void 0 : n.name] || [], a = o.includes(i.tagName), l = d.blockElements.includes(i.tagName.toLowerCase()), c = Array.from(i.children).some(
          ({ tagName: h }) => o.includes(h) && !r.includes(h)
        ), u = Array.from(i.children).some(
          ({ tagName: h }) => d.blockElements.includes(h.toLowerCase())
        );
        if (!l && !a && !c)
          return t.appendChild(i), [...e, t];
        if (a && !c || l && !u && !c)
          return [...e, t, i];
      }
      /**
       * Recursively divide HTML string to two types of nodes:
       * 1. Block element
       * 2. Document Fragments contained text and markup tags like a, b, i etc.
       *
       * @param {Node} wrapper - wrapper of paster HTML content
       * @returns {Node[]}
       */
      getNodes(s) {
        const e = Array.from(s.childNodes);
        let t;
        const o = (i, n) => {
          if (d.isEmpty(n) && !d.isSingleTag(n))
            return i;
          const r = i[i.length - 1];
          let a = new DocumentFragment();
          switch (r && d.isFragment(r) && (a = i.pop()), n.nodeType) {
            case Node.ELEMENT_NODE:
              if (t = this.processElementNode(n, i, a), t)
                return t;
              break;
            case Node.TEXT_NODE:
              return a.appendChild(n), [...i, a];
            default:
              return [...i, a];
          }
          return [...i, ...Array.from(n.childNodes).reduce(o, [])];
        };
        return e.reduce(o, []);
      }
      /**
       * Compose paste event with passed type and detail
       *
       * @param {string} type - event type
       * @param {PasteEventDetail} detail - event detail
       */
      composePasteEvent(s, e) {
        return new CustomEvent(s, {
          detail: e
        });
      }
    };
    let yt = wt;
    yt.PATTERN_PROCESSING_MAX_LENGTH = 450;
    class oi extends C {
      constructor() {
        super(...arguments), this.toolsDontSupportReadOnly = [], this.readOnlyEnabled = !1;
      }
      /**
       * Returns state of read only mode
       */
      get isEnabled() {
        return this.readOnlyEnabled;
      }
      /**
       * Set initial state
       */
      async prepare() {
        const { Tools: e } = this.Editor, { blockTools: t } = e, o = [];
        Array.from(t.entries()).forEach(([i, n]) => {
          n.isReadOnlySupported || o.push(i);
        }), this.toolsDontSupportReadOnly = o, this.config.readOnly && o.length > 0 && this.throwCriticalError(), this.toggle(this.config.readOnly);
      }
      /**
       * Set read-only mode or toggle current state
       * Call all Modules `toggleReadOnly` method and re-render Editor
       *
       * @param {boolean} state - (optional) read-only state or toggle
       */
      async toggle(e = !this.readOnlyEnabled) {
        e && this.toolsDontSupportReadOnly.length > 0 && this.throwCriticalError();
        const t = this.readOnlyEnabled;
        this.readOnlyEnabled = e;
        for (const i in this.Editor)
          this.Editor[i].toggleReadOnly && this.Editor[i].toggleReadOnly(e);
        if (t === e)
          return this.readOnlyEnabled;
        const o = await this.Editor.Saver.save();
        return await this.Editor.BlockManager.clear(), await this.Editor.Renderer.render(o.blocks), this.readOnlyEnabled;
      }
      /**
       * Throws an error about tools which don't support read-only mode
       */
      throwCriticalError() {
        throw new lt(
          `To enable read-only mode all connected tools should support it. Tools ${this.toolsDontSupportReadOnly.join(", ")} don't support read-only mode.`
        );
      }
    }
    class fe extends C {
      constructor() {
        super(...arguments), this.isRectSelectionActivated = !1, this.SCROLL_SPEED = 3, this.HEIGHT_OF_SCROLL_ZONE = 40, this.BOTTOM_SCROLL_ZONE = 1, this.TOP_SCROLL_ZONE = 2, this.MAIN_MOUSE_BUTTON = 0, this.mousedown = !1, this.isScrolling = !1, this.inScrollZone = null, this.startX = 0, this.startY = 0, this.mouseX = 0, this.mouseY = 0, this.stackOfSelected = [], this.listenerIds = [];
      }
      /**
       * CSS classes for the Block
       *
       * @returns {{wrapper: string, content: string}}
       */
      static get CSS() {
        return {
          overlay: "codex-editor-overlay",
          overlayContainer: "codex-editor-overlay__container",
          rect: "codex-editor-overlay__rectangle",
          topScrollZone: "codex-editor-overlay__scroll-zone--top",
          bottomScrollZone: "codex-editor-overlay__scroll-zone--bottom"
        };
      }
      /**
       * Module Preparation
       * Creating rect and hang handlers
       */
      prepare() {
        this.enableModuleBindings();
      }
      /**
       * Init rect params
       *
       * @param {number} pageX - X coord of mouse
       * @param {number} pageY - Y coord of mouse
       */
      startSelection(e, t) {
        const o = document.elementFromPoint(e - window.pageXOffset, t - window.pageYOffset);
        o.closest(`.${this.Editor.Toolbar.CSS.toolbar}`) || (this.Editor.BlockSelection.allBlocksSelected = !1, this.clearSelection(), this.stackOfSelected = []);
        const n = [
          `.${F.CSS.content}`,
          `.${this.Editor.Toolbar.CSS.toolbar}`,
          `.${this.Editor.InlineToolbar.CSS.inlineToolbar}`
        ], r = o.closest("." + this.Editor.UI.CSS.editorWrapper), a = n.some((l) => !!o.closest(l));
        !r || a || (this.mousedown = !0, this.startX = e, this.startY = t);
      }
      /**
       * Clear all params to end selection
       */
      endSelection() {
        this.mousedown = !1, this.startX = 0, this.startY = 0, this.overlayRectangle.style.display = "none";
      }
      /**
       * is RectSelection Activated
       */
      isRectActivated() {
        return this.isRectSelectionActivated;
      }
      /**
       * Mark that selection is end
       */
      clearSelection() {
        this.isRectSelectionActivated = !1;
      }
      /**
       * Sets Module necessary event handlers
       */
      enableModuleBindings() {
        const { container: e } = this.genHTML();
        this.listeners.on(e, "mousedown", (t) => {
          this.processMouseDown(t);
        }, !1), this.listeners.on(document.body, "mousemove", Ce((t) => {
          this.processMouseMove(t);
        }, 10), {
          passive: !0
        }), this.listeners.on(document.body, "mouseleave", () => {
          this.processMouseLeave();
        }), this.listeners.on(window, "scroll", Ce((t) => {
          this.processScroll(t);
        }, 10), {
          passive: !0
        }), this.listeners.on(document.body, "mouseup", () => {
          this.processMouseUp();
        }, !1);
      }
      /**
       * Handle mouse down events
       *
       * @param {MouseEvent} mouseEvent - mouse event payload
       */
      processMouseDown(e) {
        if (e.button !== this.MAIN_MOUSE_BUTTON)
          return;
        e.target.closest(d.allInputsSelector) !== null || this.startSelection(e.pageX, e.pageY);
      }
      /**
       * Handle mouse move events
       *
       * @param {MouseEvent} mouseEvent - mouse event payload
       */
      processMouseMove(e) {
        this.changingRectangle(e), this.scrollByZones(e.clientY);
      }
      /**
       * Handle mouse leave
       */
      processMouseLeave() {
        this.clearSelection(), this.endSelection();
      }
      /**
       * @param {MouseEvent} mouseEvent - mouse event payload
       */
      processScroll(e) {
        this.changingRectangle(e);
      }
      /**
       * Handle mouse up
       */
      processMouseUp() {
        this.clearSelection(), this.endSelection();
      }
      /**
       * Scroll If mouse in scroll zone
       *
       * @param {number} clientY - Y coord of mouse
       */
      scrollByZones(e) {
        if (this.inScrollZone = null, e <= this.HEIGHT_OF_SCROLL_ZONE && (this.inScrollZone = this.TOP_SCROLL_ZONE), document.documentElement.clientHeight - e <= this.HEIGHT_OF_SCROLL_ZONE && (this.inScrollZone = this.BOTTOM_SCROLL_ZONE), !this.inScrollZone) {
          this.isScrolling = !1;
          return;
        }
        this.isScrolling || (this.scrollVertical(this.inScrollZone === this.TOP_SCROLL_ZONE ? -this.SCROLL_SPEED : this.SCROLL_SPEED), this.isScrolling = !0);
      }
      /**
       * Generates required HTML elements
       *
       * @returns {Object<string, Element>}
       */
      genHTML() {
        const { UI: e } = this.Editor, t = e.nodes.holder.querySelector("." + e.CSS.editorWrapper), o = d.make("div", fe.CSS.overlay, {}), i = d.make("div", fe.CSS.overlayContainer, {}), n = d.make("div", fe.CSS.rect, {});
        return i.appendChild(n), o.appendChild(i), t.appendChild(o), this.overlayRectangle = n, {
          container: t,
          overlay: o
        };
      }
      /**
       * Activates scrolling if blockSelection is active and mouse is in scroll zone
       *
       * @param {number} speed - speed of scrolling
       */
      scrollVertical(e) {
        if (!(this.inScrollZone && this.mousedown))
          return;
        const t = window.pageYOffset;
        window.scrollBy(0, e), this.mouseY += window.pageYOffset - t, setTimeout(() => {
          this.scrollVertical(e);
        }, 0);
      }
      /**
       * Handles the change in the rectangle and its effect
       *
       * @param {MouseEvent} event - mouse event
       */
      changingRectangle(e) {
        if (!this.mousedown)
          return;
        e.pageY !== void 0 && (this.mouseX = e.pageX, this.mouseY = e.pageY);
        const { rightPos: t, leftPos: o, index: i } = this.genInfoForMouseSelection(), n = this.startX > t && this.mouseX > t, r = this.startX < o && this.mouseX < o;
        this.rectCrossesBlocks = !(n || r), this.isRectSelectionActivated || (this.rectCrossesBlocks = !1, this.isRectSelectionActivated = !0, this.shrinkRectangleToPoint(), this.overlayRectangle.style.display = "block"), this.updateRectangleSize(), this.Editor.Toolbar.close(), i !== void 0 && (this.trySelectNextBlock(i), this.inverseSelection(), m.get().removeAllRanges());
      }
      /**
       * Shrink rect to singular point
       */
      shrinkRectangleToPoint() {
        this.overlayRectangle.style.left = `${this.startX - window.pageXOffset}px`, this.overlayRectangle.style.top = `${this.startY - window.pageYOffset}px`, this.overlayRectangle.style.bottom = `calc(100% - ${this.startY - window.pageYOffset}px`, this.overlayRectangle.style.right = `calc(100% - ${this.startX - window.pageXOffset}px`;
      }
      /**
       * Select or unselect all of blocks in array if rect is out or in selectable area
       */
      inverseSelection() {
        const t = this.Editor.BlockManager.getBlockByIndex(this.stackOfSelected[0]).selected;
        if (this.rectCrossesBlocks && !t)
          for (const o of this.stackOfSelected)
            this.Editor.BlockSelection.selectBlockByIndex(o);
        if (!this.rectCrossesBlocks && t)
          for (const o of this.stackOfSelected)
            this.Editor.BlockSelection.unSelectBlockByIndex(o);
      }
      /**
       * Updates size of rectangle
       */
      updateRectangleSize() {
        this.mouseY >= this.startY ? (this.overlayRectangle.style.top = `${this.startY - window.pageYOffset}px`, this.overlayRectangle.style.bottom = `calc(100% - ${this.mouseY - window.pageYOffset}px`) : (this.overlayRectangle.style.bottom = `calc(100% - ${this.startY - window.pageYOffset}px`, this.overlayRectangle.style.top = `${this.mouseY - window.pageYOffset}px`), this.mouseX >= this.startX ? (this.overlayRectangle.style.left = `${this.startX - window.pageXOffset}px`, this.overlayRectangle.style.right = `calc(100% - ${this.mouseX - window.pageXOffset}px`) : (this.overlayRectangle.style.right = `calc(100% - ${this.startX - window.pageXOffset}px`, this.overlayRectangle.style.left = `${this.mouseX - window.pageXOffset}px`);
      }
      /**
       * Collects information needed to determine the behavior of the rectangle
       *
       * @returns {object} index - index next Block, leftPos - start of left border of Block, rightPos - right border
       */
      genInfoForMouseSelection() {
        const t = document.body.offsetWidth / 2, o = this.mouseY - window.pageYOffset, i = document.elementFromPoint(t, o), n = this.Editor.BlockManager.getBlockByChildNode(i);
        let r;
        n !== void 0 && (r = this.Editor.BlockManager.blocks.findIndex((h) => h.holder === n.holder));
        const a = this.Editor.BlockManager.lastBlock.holder.querySelector("." + F.CSS.content), l = Number.parseInt(window.getComputedStyle(a).width, 10) / 2, c = t - l, u = t + l;
        return {
          index: r,
          leftPos: c,
          rightPos: u
        };
      }
      /**
       * Select block with index index
       *
       * @param index - index of block in redactor
       */
      addBlockInSelection(e) {
        this.rectCrossesBlocks && this.Editor.BlockSelection.selectBlockByIndex(e), this.stackOfSelected.push(e);
      }
      /**
       * Adds a block to the selection and determines which blocks should be selected
       *
       * @param {object} index - index of new block in the reactor
       */
      trySelectNextBlock(e) {
        const t = this.stackOfSelected[this.stackOfSelected.length - 1] === e, o = this.stackOfSelected.length, i = 1, n = -1, r = 0;
        if (t)
          return;
        const a = this.stackOfSelected[o - 1] - this.stackOfSelected[o - 2] > 0;
        let l = r;
        o > 1 && (l = a ? i : n);
        const c = e > this.stackOfSelected[o - 1] && l === i, u = e < this.stackOfSelected[o - 1] && l === n, f = !(c || u || l === r);
        if (!f && (e > this.stackOfSelected[o - 1] || this.stackOfSelected[o - 1] === void 0)) {
          let v = this.stackOfSelected[o - 1] + 1 || e;
          for (v; v <= e; v++)
            this.addBlockInSelection(v);
          return;
        }
        if (!f && e < this.stackOfSelected[o - 1]) {
          for (let v = this.stackOfSelected[o - 1] - 1; v >= e; v--)
            this.addBlockInSelection(v);
          return;
        }
        if (!f)
          return;
        let k = o - 1, p;
        for (e > this.stackOfSelected[o - 1] ? p = () => e > this.stackOfSelected[k] : p = () => e < this.stackOfSelected[k]; p(); )
          this.rectCrossesBlocks && this.Editor.BlockSelection.unSelectBlockByIndex(this.stackOfSelected[k]), this.stackOfSelected.pop(), k--;
      }
    }
    class ii extends C {
      /**
       * Renders passed blocks as one batch
       *
       * @param blocksData - blocks to render
       */
      async render(e) {
        return new Promise((t) => {
          const { Tools: o, BlockManager: i } = this.Editor, n = e.map(({ type: r, data: a, tunes: l, id: c }) => {
            o.available.has(r) === !1 && (K(`Tool «${r}» is not found. Check 'tools' property at the Editor.js config.`, "warn"), a = this.composeStubDataForTool(r, a, c), r = o.stubTool);
            let u;
            try {
              u = i.composeBlock({
                id: c,
                tool: r,
                data: a,
                tunes: l
              });
            } catch (h) {
              L(`Block «${r}» skipped because of plugins error`, "error", {
                data: a,
                error: h
              }), a = this.composeStubDataForTool(r, a, c), r = o.stubTool, u = i.composeBlock({
                id: c,
                tool: r,
                data: a,
                tunes: l
              });
            }
            return u;
          });
          i.insertMany(n), window.requestIdleCallback(() => {
            t();
          }, { timeout: 2e3 });
        });
      }
      /**
       * Create data for the Stub Tool that will be used instead of unavailable tool
       *
       * @param tool - unavailable tool name to stub
       * @param data - data of unavailable block
       * @param [id] - id of unavailable block
       */
      composeStubDataForTool(e, t, o) {
        const { Tools: i } = this.Editor;
        let n = e;
        if (i.unavailable.has(e)) {
          const r = i.unavailable.get(e).toolbox;
          r !== void 0 && r[0].title !== void 0 && (n = r[0].title);
        }
        return {
          savedData: {
            id: o,
            type: e,
            data: t
          },
          title: n
        };
      }
    }
    class ni extends C {
      /**
       * Composes new chain of Promises to fire them alternatelly
       *
       * @returns {OutputData}
       */
      async save() {
        const { BlockManager: e, Tools: t } = this.Editor, o = e.blocks, i = [];
        try {
          o.forEach((a) => {
            i.push(this.getSavedData(a));
          });
          const n = await Promise.all(i), r = await ut(n, (a) => t.blockTools.get(a).sanitizeConfig);
          return this.makeOutput(r);
        } catch (n) {
          K("Saving failed due to the Error %o", "error", n);
        }
      }
      /**
       * Saves and validates
       *
       * @param {Block} block - Editor's Tool
       * @returns {ValidatedData} - Tool's validated data
       */
      async getSavedData(e) {
        const t = await e.save(), o = t && await e.validate(t.data);
        return {
          ...t,
          isValid: o
        };
      }
      /**
       * Creates output object with saved data, time and version of editor
       *
       * @param {ValidatedData} allExtractedData - data extracted from Blocks
       * @returns {OutputData}
       */
      makeOutput(e) {
        const t = [];
        return e.forEach(({ id: o, tool: i, data: n, tunes: r, isValid: a }) => {
          if (!a) {
            L(`Block «${i}» skipped because saved data is invalid`);
            return;
          }
          if (i === this.Editor.Tools.stubTool) {
            t.push(n);
            return;
          }
          const l = {
            id: o,
            type: i,
            data: n,
            ...!V(r) && {
              tunes: r
            }
          };
          t.push(l);
        }), {
          time: +/* @__PURE__ */ new Date(),
          blocks: t,
          version: "2.28.2"
        };
      }
    }
    var Ne = {}, si = {
      get exports() {
        return Ne;
      },
      set exports(s) {
        Ne = s;
      }
    };
    (function(s, e) {
      (function(t, o) {
        s.exports = o();
      })(window, function() {
        return function(t) {
          var o = {};
          function i(n) {
            if (o[n])
              return o[n].exports;
            var r = o[n] = { i: n, l: !1, exports: {} };
            return t[n].call(r.exports, r, r.exports, i), r.l = !0, r.exports;
          }
          return i.m = t, i.c = o, i.d = function(n, r, a) {
            i.o(n, r) || Object.defineProperty(n, r, { enumerable: !0, get: a });
          }, i.r = function(n) {
            typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(n, "__esModule", { value: !0 });
          }, i.t = function(n, r) {
            if (1 & r && (n = i(n)), 8 & r || 4 & r && typeof n == "object" && n && n.__esModule)
              return n;
            var a = /* @__PURE__ */ Object.create(null);
            if (i.r(a), Object.defineProperty(a, "default", { enumerable: !0, value: n }), 2 & r && typeof n != "string")
              for (var l in n)
                i.d(a, l, function(c) {
                  return n[c];
                }.bind(null, l));
            return a;
          }, i.n = function(n) {
            var r = n && n.__esModule ? function() {
              return n.default;
            } : function() {
              return n;
            };
            return i.d(r, "a", r), r;
          }, i.o = function(n, r) {
            return Object.prototype.hasOwnProperty.call(n, r);
          }, i.p = "/", i(i.s = 4);
        }([function(t, o, i) {
          var n = i(1), r = i(2);
          typeof (r = r.__esModule ? r.default : r) == "string" && (r = [[t.i, r, ""]]);
          var a = { insert: "head", singleton: !1 };
          n(r, a), t.exports = r.locals || {};
        }, function(t, o, i) {
          var n, r = function() {
            return n === void 0 && (n = !!(window && document && document.all && !window.atob)), n;
          }, a = function() {
            var y = {};
            return function(x) {
              if (y[x] === void 0) {
                var w = document.querySelector(x);
                if (window.HTMLIFrameElement && w instanceof window.HTMLIFrameElement)
                  try {
                    w = w.contentDocument.head;
                  } catch {
                    w = null;
                  }
                y[x] = w;
              }
              return y[x];
            };
          }(), l = [];
          function c(y) {
            for (var x = -1, w = 0; w < l.length; w++)
              if (l[w].identifier === y) {
                x = w;
                break;
              }
            return x;
          }
          function u(y, x) {
            for (var w = {}, I = [], R = 0; R < y.length; R++) {
              var b = y[R], g = x.base ? b[0] + x.base : b[0], E = w[g] || 0, T = "".concat(g, " ").concat(E);
              w[g] = E + 1;
              var O = c(T), S = { css: b[1], media: b[2], sourceMap: b[3] };
              O !== -1 ? (l[O].references++, l[O].updater(S)) : l.push({ identifier: T, updater: _(S, x), references: 1 }), I.push(T);
            }
            return I;
          }
          function h(y) {
            var x = document.createElement("style"), w = y.attributes || {};
            if (w.nonce === void 0) {
              var I = i.nc;
              I && (w.nonce = I);
            }
            if (Object.keys(w).forEach(function(b) {
              x.setAttribute(b, w[b]);
            }), typeof y.insert == "function")
              y.insert(x);
            else {
              var R = a(y.insert || "head");
              if (!R)
                throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
              R.appendChild(x);
            }
            return x;
          }
          var f, k = (f = [], function(y, x) {
            return f[y] = x, f.filter(Boolean).join(`
`);
          });
          function p(y, x, w, I) {
            var R = w ? "" : I.media ? "@media ".concat(I.media, " {").concat(I.css, "}") : I.css;
            if (y.styleSheet)
              y.styleSheet.cssText = k(x, R);
            else {
              var b = document.createTextNode(R), g = y.childNodes;
              g[x] && y.removeChild(g[x]), g.length ? y.insertBefore(b, g[x]) : y.appendChild(b);
            }
          }
          function v(y, x, w) {
            var I = w.css, R = w.media, b = w.sourceMap;
            if (R ? y.setAttribute("media", R) : y.removeAttribute("media"), b && btoa && (I += `
/*# sourceMappingURL=data:application/json;base64,`.concat(btoa(unescape(encodeURIComponent(JSON.stringify(b)))), " */")), y.styleSheet)
              y.styleSheet.cssText = I;
            else {
              for (; y.firstChild; )
                y.removeChild(y.firstChild);
              y.appendChild(document.createTextNode(I));
            }
          }
          var A = null, N = 0;
          function _(y, x) {
            var w, I, R;
            if (x.singleton) {
              var b = N++;
              w = A || (A = h(x)), I = p.bind(null, w, b, !1), R = p.bind(null, w, b, !0);
            } else
              w = h(x), I = v.bind(null, w, x), R = function() {
                (function(g) {
                  if (g.parentNode === null)
                    return !1;
                  g.parentNode.removeChild(g);
                })(w);
              };
            return I(y), function(g) {
              if (g) {
                if (g.css === y.css && g.media === y.media && g.sourceMap === y.sourceMap)
                  return;
                I(y = g);
              } else
                R();
            };
          }
          t.exports = function(y, x) {
            (x = x || {}).singleton || typeof x.singleton == "boolean" || (x.singleton = r());
            var w = u(y = y || [], x);
            return function(I) {
              if (I = I || [], Object.prototype.toString.call(I) === "[object Array]") {
                for (var R = 0; R < w.length; R++) {
                  var b = c(w[R]);
                  l[b].references--;
                }
                for (var g = u(I, x), E = 0; E < w.length; E++) {
                  var T = c(w[E]);
                  l[T].references === 0 && (l[T].updater(), l.splice(T, 1));
                }
                w = g;
              }
            };
          };
        }, function(t, o, i) {
          (o = i(3)(!1)).push([t.i, `.ce-paragraph {
    line-height: 1.6em;
    outline: none;
}

.ce-paragraph[data-placeholder]:empty::before{
  content: attr(data-placeholder);
  color: #707684;
  font-weight: normal;
  opacity: 0;
}

/** Show placeholder at the first paragraph if Editor is empty */
.codex-editor--empty .ce-block:first-child .ce-paragraph[data-placeholder]:empty::before {
  opacity: 1;
}

.codex-editor--toolbox-opened .ce-block:first-child .ce-paragraph[data-placeholder]:empty::before,
.codex-editor--empty .ce-block:first-child .ce-paragraph[data-placeholder]:empty:focus::before {
  opacity: 0;
}

.ce-paragraph p:first-of-type{
    margin-top: 0;
}

.ce-paragraph p:last-of-type{
    margin-bottom: 0;
}
`, ""]), t.exports = o;
        }, function(t, o, i) {
          t.exports = function(n) {
            var r = [];
            return r.toString = function() {
              return this.map(function(a) {
                var l = function(c, u) {
                  var h = c[1] || "", f = c[3];
                  if (!f)
                    return h;
                  if (u && typeof btoa == "function") {
                    var k = (v = f, A = btoa(unescape(encodeURIComponent(JSON.stringify(v)))), N = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(A), "/*# ".concat(N, " */")), p = f.sources.map(function(_) {
                      return "/*# sourceURL=".concat(f.sourceRoot || "").concat(_, " */");
                    });
                    return [h].concat(p).concat([k]).join(`
`);
                  }
                  var v, A, N;
                  return [h].join(`
`);
                }(a, n);
                return a[2] ? "@media ".concat(a[2], " {").concat(l, "}") : l;
              }).join("");
            }, r.i = function(a, l, c) {
              typeof a == "string" && (a = [[null, a, ""]]);
              var u = {};
              if (c)
                for (var h = 0; h < this.length; h++) {
                  var f = this[h][0];
                  f != null && (u[f] = !0);
                }
              for (var k = 0; k < a.length; k++) {
                var p = [].concat(a[k]);
                c && u[p[0]] || (l && (p[2] ? p[2] = "".concat(l, " and ").concat(p[2]) : p[2] = l), r.push(p));
              }
            }, r;
          };
        }, function(t, o, i) {
          i.r(o), i.d(o, "default", function() {
            return a;
          }), i(0);
          function n(l, c) {
            for (var u = 0; u < c.length; u++) {
              var h = c[u];
              h.enumerable = h.enumerable || !1, h.configurable = !0, "value" in h && (h.writable = !0), Object.defineProperty(l, h.key, h);
            }
          }
          function r(l, c, u) {
            return c && n(l.prototype, c), u && n(l, u), l;
          }
          /**
           * Base Paragraph Block for the Editor.js.
           * Represents a regular text block
           *
           * @author CodeX (team@codex.so)
           * @copyright CodeX 2018
           * @license The MIT License (MIT)
           */
          var a = function() {
            function l(c) {
              var u = c.data, h = c.config, f = c.api, k = c.readOnly;
              ((function(p, v) {
                if (!(p instanceof v))
                  throw new TypeError("Cannot call a class as a function");
              }))(this, l), this.api = f, this.readOnly = k, this._CSS = { block: this.api.styles.block, wrapper: "ce-paragraph" }, this.readOnly || (this.onKeyUp = this.onKeyUp.bind(this)), this._placeholder = h.placeholder ? h.placeholder : l.DEFAULT_PLACEHOLDER, this._data = {}, this._element = null, this._preserveBlank = h.preserveBlank !== void 0 && h.preserveBlank, this.data = u;
            }
            return r(l, null, [{ key: "DEFAULT_PLACEHOLDER", get: function() {
              return "";
            } }]), r(l, [{ key: "onKeyUp", value: function(c) {
              c.code !== "Backspace" && c.code !== "Delete" || this._element.textContent === "" && (this._element.innerHTML = "");
            } }, { key: "drawView", value: function() {
              var c = document.createElement("DIV");
              return c.classList.add(this._CSS.wrapper, this._CSS.block), c.contentEditable = !1, c.dataset.placeholder = this.api.i18n.t(this._placeholder), this.readOnly || (c.contentEditable = !0, c.addEventListener("keyup", this.onKeyUp)), c;
            } }, { key: "render", value: function() {
              return this._element === null && (this._element = this.drawView()), this.hydrate(), this._element;
            } }, { key: "merge", value: function(c) {
              var u = { text: this.data.text + c.text };
              this.data = u;
            } }, { key: "validate", value: function(c) {
              return !(c.text.trim() === "" && !this._preserveBlank);
            } }, { key: "save", value: function(c) {
              return { text: c.innerHTML };
            } }, { key: "onPaste", value: function(c) {
              var u = { text: c.detail.data.innerHTML };
              this.data = u;
            } }, { key: "hydrate", value: function() {
              var c = this;
              window.requestAnimationFrame(function() {
                c._element.innerHTML = c._data.text || "";
              });
            } }, { key: "data", get: function() {
              if (this._element !== null) {
                var c = this._element.innerHTML;
                this._data.text = c;
              }
              return this._data;
            }, set: function(c) {
              this._data = c || {}, this._element !== null && this.hydrate();
            } }], [{ key: "conversionConfig", get: function() {
              return { export: "text", import: "text" };
            } }, { key: "sanitize", get: function() {
              return { text: { br: !0 } };
            } }, { key: "isReadOnlySupported", get: function() {
              return !0;
            } }, { key: "pasteConfig", get: function() {
              return { tags: ["P"] };
            } }, { key: "toolbox", get: function() {
              return { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M8 9V7.2C8 7.08954 8.08954 7 8.2 7L12 7M16 9V7.2C16 7.08954 15.9105 7 15.8 7L12 7M12 7L12 17M12 17H10M12 17H14"/></svg>', title: "Text" };
            } }]), l;
          }();
        }]).default;
      });
    })(si);
    const ri = /* @__PURE__ */ xe(Ne);
    class We {
      constructor() {
        this.commandName = "bold", this.CSS = {
          button: "ce-inline-tool",
          buttonActive: "ce-inline-tool--active",
          buttonModifier: "ce-inline-tool--bold"
        }, this.nodes = {
          button: void 0
        };
      }
      /**
       * Sanitizer Rule
       * Leave <b> tags
       *
       * @returns {object}
       */
      static get sanitize() {
        return {
          b: {}
        };
      }
      /**
       * Create button for Inline Toolbar
       */
      render() {
        return this.nodes.button = document.createElement("button"), this.nodes.button.type = "button", this.nodes.button.classList.add(this.CSS.button, this.CSS.buttonModifier), this.nodes.button.innerHTML = So, this.nodes.button;
      }
      /**
       * Wrap range with <b> tag
       */
      surround() {
        document.execCommand(this.commandName);
      }
      /**
       * Check selection and set activated state to button if there are <b> tag
       *
       * @returns {boolean}
       */
      checkState() {
        const e = document.queryCommandState(this.commandName);
        return this.nodes.button.classList.toggle(this.CSS.buttonActive, e), e;
      }
      /**
       * Set a shortcut
       *
       * @returns {boolean}
       */
      get shortcut() {
        return "CMD+B";
      }
    }
    We.isInline = !0;
    We.title = "Bold";
    class Ye {
      constructor() {
        this.commandName = "italic", this.CSS = {
          button: "ce-inline-tool",
          buttonActive: "ce-inline-tool--active",
          buttonModifier: "ce-inline-tool--italic"
        }, this.nodes = {
          button: null
        };
      }
      /**
       * Sanitizer Rule
       * Leave <i> tags
       *
       * @returns {object}
       */
      static get sanitize() {
        return {
          i: {}
        };
      }
      /**
       * Create button for Inline Toolbar
       */
      render() {
        return this.nodes.button = document.createElement("button"), this.nodes.button.type = "button", this.nodes.button.classList.add(this.CSS.button, this.CSS.buttonModifier), this.nodes.button.innerHTML = Oo, this.nodes.button;
      }
      /**
       * Wrap range with <i> tag
       */
      surround() {
        document.execCommand(this.commandName);
      }
      /**
       * Check selection and set activated state to button if there are <i> tag
       */
      checkState() {
        const e = document.queryCommandState(this.commandName);
        return this.nodes.button.classList.toggle(this.CSS.buttonActive, e), e;
      }
      /**
       * Set a shortcut
       */
      get shortcut() {
        return "CMD+I";
      }
    }
    Ye.isInline = !0;
    Ye.title = "Italic";
    class Ke {
      /**
       * @param api - Editor.js API
       */
      constructor({ api: e }) {
        this.commandLink = "createLink", this.commandUnlink = "unlink", this.ENTER_KEY = 13, this.CSS = {
          button: "ce-inline-tool",
          buttonActive: "ce-inline-tool--active",
          buttonModifier: "ce-inline-tool--link",
          buttonUnlink: "ce-inline-tool--unlink",
          input: "ce-inline-tool-input",
          inputShowed: "ce-inline-tool-input--showed"
        }, this.nodes = {
          button: null,
          input: null
        }, this.inputOpened = !1, this.toolbar = e.toolbar, this.inlineToolbar = e.inlineToolbar, this.notifier = e.notifier, this.i18n = e.i18n, this.selection = new m();
      }
      /**
       * Sanitizer Rule
       * Leave <a> tags
       *
       * @returns {object}
       */
      static get sanitize() {
        return {
          a: {
            href: !0,
            target: "_blank",
            rel: "nofollow"
          }
        };
      }
      /**
       * Create button for Inline Toolbar
       */
      render() {
        return this.nodes.button = document.createElement("button"), this.nodes.button.type = "button", this.nodes.button.classList.add(this.CSS.button, this.CSS.buttonModifier), this.nodes.button.innerHTML = Qe, this.nodes.button;
      }
      /**
       * Input for the link
       */
      renderActions() {
        return this.nodes.input = document.createElement("input"), this.nodes.input.placeholder = this.i18n.t("Add a link"), this.nodes.input.classList.add(this.CSS.input), this.nodes.input.addEventListener("keydown", (e) => {
          e.keyCode === this.ENTER_KEY && this.enterPressed(e);
        }), this.nodes.input;
      }
      /**
       * Handle clicks on the Inline Toolbar icon
       *
       * @param {Range} range - range to wrap with link
       */
      surround(e) {
        if (e) {
          this.inputOpened ? (this.selection.restore(), this.selection.removeFakeBackground()) : (this.selection.setFakeBackground(), this.selection.save());
          const t = this.selection.findParentTag("A");
          if (t) {
            this.selection.expandToTag(t), this.unlink(), this.closeActions(), this.checkState(), this.toolbar.close();
            return;
          }
        }
        this.toggleActions();
      }
      /**
       * Check selection and set activated state to button if there are <a> tag
       */
      checkState() {
        const e = this.selection.findParentTag("A");
        if (e) {
          this.nodes.button.innerHTML = Ro, this.nodes.button.classList.add(this.CSS.buttonUnlink), this.nodes.button.classList.add(this.CSS.buttonActive), this.openActions();
          const t = e.getAttribute("href");
          this.nodes.input.value = t !== "null" ? t : "", this.selection.save();
        } else
          this.nodes.button.innerHTML = Qe, this.nodes.button.classList.remove(this.CSS.buttonUnlink), this.nodes.button.classList.remove(this.CSS.buttonActive);
        return !!e;
      }
      /**
       * Function called with Inline Toolbar closing
       */
      clear() {
        this.closeActions();
      }
      /**
       * Set a shortcut
       */
      get shortcut() {
        return "CMD+K";
      }
      /**
       * Show/close link input
       */
      toggleActions() {
        this.inputOpened ? this.closeActions(!1) : this.openActions(!0);
      }
      /**
       * @param {boolean} needFocus - on link creation we need to focus input. On editing - nope.
       */
      openActions(e = !1) {
        this.nodes.input.classList.add(this.CSS.inputShowed), e && this.nodes.input.focus(), this.inputOpened = !0;
      }
      /**
       * Close input
       *
       * @param {boolean} clearSavedSelection — we don't need to clear saved selection
       *                                        on toggle-clicks on the icon of opened Toolbar
       */
      closeActions(e = !0) {
        if (this.selection.isFakeBackgroundEnabled) {
          const t = new m();
          t.save(), this.selection.restore(), this.selection.removeFakeBackground(), t.restore();
        }
        this.nodes.input.classList.remove(this.CSS.inputShowed), this.nodes.input.value = "", e && this.selection.clearSaved(), this.inputOpened = !1;
      }
      /**
       * Enter pressed on input
       *
       * @param {KeyboardEvent} event - enter keydown event
       */
      enterPressed(e) {
        let t = this.nodes.input.value || "";
        if (!t.trim()) {
          this.selection.restore(), this.unlink(), e.preventDefault(), this.closeActions();
          return;
        }
        if (!this.validateURL(t)) {
          this.notifier.show({
            message: "Pasted link is not valid.",
            style: "error"
          }), L("Incorrect Link pasted", "warn", t);
          return;
        }
        t = this.prepareLink(t), this.selection.restore(), this.selection.removeFakeBackground(), this.insertLink(t), e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), this.selection.collapseToEnd(), this.inlineToolbar.close();
      }
      /**
       * Detects if passed string is URL
       *
       * @param {string} str - string to validate
       * @returns {boolean}
       */
      validateURL(e) {
        return !/\s/.test(e);
      }
      /**
       * Process link before injection
       * - sanitize
       * - add protocol for links like 'google.com'
       *
       * @param {string} link - raw user input
       */
      prepareLink(e) {
        return e = e.trim(), e = this.addProtocol(e), e;
      }
      /**
       * Add 'http' protocol to the links like 'vc.ru', 'google.com'
       *
       * @param {string} link - string to process
       */
      addProtocol(e) {
        if (/^(\w+):(\/\/)?/.test(e))
          return e;
        const t = /^\/[^/\s]/.test(e), o = e.substring(0, 1) === "#", i = /^\/\/[^/\s]/.test(e);
        return !t && !o && !i && (e = "http://" + e), e;
      }
      /**
       * Inserts <a> tag with "href"
       *
       * @param {string} link - "href" value
       */
      insertLink(e) {
        const t = this.selection.findParentTag("A");
        t && this.selection.expandToTag(t), document.execCommand(this.commandLink, !1, e);
      }
      /**
       * Removes <a> tag
       */
      unlink() {
        document.execCommand(this.commandUnlink);
      }
    }
    Ke.isInline = !0;
    Ke.title = "Link";
    class Et {
      /**
       * @param options - constructor options
       * @param options.data - stub tool data
       * @param options.api - Editor.js API
       */
      constructor({ data: e, api: t }) {
        this.CSS = {
          wrapper: "ce-stub",
          info: "ce-stub__info",
          title: "ce-stub__title",
          subtitle: "ce-stub__subtitle"
        }, this.api = t, this.title = e.title || this.api.i18n.t("Error"), this.subtitle = this.api.i18n.t("The block can not be displayed correctly."), this.savedData = e.savedData, this.wrapper = this.make();
      }
      /**
       * Returns stub holder
       *
       * @returns {HTMLElement}
       */
      render() {
        return this.wrapper;
      }
      /**
       * Return original Tool data
       *
       * @returns {BlockToolData}
       */
      save() {
        return this.savedData;
      }
      /**
       * Create Tool html markup
       *
       * @returns {HTMLElement}
       */
      make() {
        const e = d.make("div", this.CSS.wrapper), t = Do, o = d.make("div", this.CSS.info), i = d.make("div", this.CSS.title, {
          textContent: this.title
        }), n = d.make("div", this.CSS.subtitle, {
          textContent: this.subtitle
        });
        return e.innerHTML = t, o.appendChild(i), o.appendChild(n), e.appendChild(o), e;
      }
    }
    Et.isReadOnlySupported = !0;
    class ai extends $e {
      constructor() {
        super(...arguments), this.type = ye.Inline;
      }
      /**
       * Returns title for Inline Tool if specified by user
       */
      get title() {
        return this.constructable[Ue.Title];
      }
      /**
       * Constructs new InlineTool instance from constructable
       */
      create() {
        return new this.constructable({
          api: this.api.getMethodsForTool(this),
          config: this.settings
        });
      }
    }
    class li extends $e {
      constructor() {
        super(...arguments), this.type = ye.Tune;
      }
      /**
       * Constructs new BlockTune instance from constructable
       *
       * @param data - Tune data
       * @param block - Block API object
       */
      create(e, t) {
        return new this.constructable({
          api: this.api.getMethodsForTool(this),
          config: this.settings,
          block: t,
          data: e
        });
      }
    }
    class U extends Map {
      /**
       * Returns Block Tools collection
       */
      get blockTools() {
        const e = Array.from(this.entries()).filter(([, t]) => t.isBlock());
        return new U(e);
      }
      /**
       * Returns Inline Tools collection
       */
      get inlineTools() {
        const e = Array.from(this.entries()).filter(([, t]) => t.isInline());
        return new U(e);
      }
      /**
       * Returns Block Tunes collection
       */
      get blockTunes() {
        const e = Array.from(this.entries()).filter(([, t]) => t.isTune());
        return new U(e);
      }
      /**
       * Returns internal Tools collection
       */
      get internalTools() {
        const e = Array.from(this.entries()).filter(([, t]) => t.isInternal);
        return new U(e);
      }
      /**
       * Returns Tools collection provided by user
       */
      get externalTools() {
        const e = Array.from(this.entries()).filter(([, t]) => !t.isInternal);
        return new U(e);
      }
    }
    var ci = Object.defineProperty, di = Object.getOwnPropertyDescriptor, Bt = (s, e, t, o) => {
      for (var i = o > 1 ? void 0 : o ? di(e, t) : e, n = s.length - 1, r; n >= 0; n--)
        (r = s[n]) && (i = (o ? r(e, t, i) : r(i)) || i);
      return o && i && ci(e, t, i), i;
    };
    class Xe extends $e {
      constructor() {
        super(...arguments), this.type = ye.Block, this.inlineTools = new U(), this.tunes = new U();
      }
      /**
       * Creates new Tool instance
       *
       * @param data - Tool data
       * @param block - BlockAPI for current Block
       * @param readOnly - True if Editor is in read-only mode
       */
      create(e, t, o) {
        return new this.constructable({
          data: e,
          block: t,
          readOnly: o,
          api: this.api.getMethodsForTool(this),
          config: this.settings
        });
      }
      /**
       * Returns true if read-only mode is supported by Tool
       */
      get isReadOnlySupported() {
        return this.constructable[se.IsReadOnlySupported] === !0;
      }
      /**
       * Returns true if Tool supports linebreaks
       */
      get isLineBreaksEnabled() {
        return this.constructable[se.IsEnabledLineBreaks];
      }
      /**
       * Returns Tool toolbox configuration (internal or user-specified).
       *
       * Merges internal and user-defined toolbox configs based on the following rules:
       *
       * - If both internal and user-defined toolbox configs are arrays their items are merged.
       * Length of the second one is kept.
       *
       * - If both are objects their properties are merged.
       *
       * - If one is an object and another is an array than internal config is replaced with user-defined
       * config. This is made to allow user to override default tool's toolbox representation (single/multiple entries)
       */
      get toolbox() {
        const e = this.constructable[se.Toolbox], t = this.config[ke.Toolbox];
        if (!V(e) && t !== !1)
          return t ? Array.isArray(e) ? Array.isArray(t) ? t.map((o, i) => {
            const n = e[i];
            return n ? {
              ...n,
              ...o
            } : o;
          }) : [t] : Array.isArray(t) ? t : [
            {
              ...e,
              ...t
            }
          ] : Array.isArray(e) ? e : [e];
      }
      /**
       * Returns Tool conversion configuration
       */
      get conversionConfig() {
        return this.constructable[se.ConversionConfig];
      }
      /**
       * Returns enabled inline tools for Tool
       */
      get enabledInlineTools() {
        return this.config[ke.EnabledInlineTools] || !1;
      }
      /**
       * Returns enabled tunes for Tool
       */
      get enabledBlockTunes() {
        return this.config[ke.EnabledBlockTunes];
      }
      /**
       * Returns Tool paste configuration
       */
      get pasteConfig() {
        return this.constructable[se.PasteConfig] ?? {};
      }
      get sanitizeConfig() {
        const e = super.sanitizeConfig, t = this.baseSanitizeConfig;
        if (V(e))
          return t;
        const o = {};
        for (const i in e)
          if (Object.prototype.hasOwnProperty.call(e, i)) {
            const n = e[i];
            z(n) ? o[i] = Object.assign({}, t, n) : o[i] = n;
          }
        return o;
      }
      get baseSanitizeConfig() {
        const e = {};
        return Array.from(this.inlineTools.values()).forEach((t) => Object.assign(e, t.sanitizeConfig)), Array.from(this.tunes.values()).forEach((t) => Object.assign(e, t.sanitizeConfig)), e;
      }
    }
    Bt([
      ce
    ], Xe.prototype, "sanitizeConfig", 1);
    Bt([
      ce
    ], Xe.prototype, "baseSanitizeConfig", 1);
    class hi {
      /**
       * @class
       * @param config - tools config
       * @param editorConfig - EditorJS config
       * @param api - EditorJS API module
       */
      constructor(e, t, o) {
        this.api = o, this.config = e, this.editorConfig = t;
      }
      /**
       * Returns Tool object based on it's type
       *
       * @param name - tool name
       */
      get(e) {
        const { class: t, isInternal: o = !1, ...i } = this.config[e], n = this.getConstructor(t);
        return new n({
          name: e,
          constructable: t,
          config: i,
          api: this.api,
          isDefault: e === this.editorConfig.defaultBlock,
          defaultPlaceholder: this.editorConfig.placeholder,
          isInternal: o
        });
      }
      /**
       * Find appropriate Tool object constructor for Tool constructable
       *
       * @param constructable - Tools constructable
       */
      getConstructor(e) {
        switch (!0) {
          case e[Ue.IsInline]:
            return ai;
          case e[xt.IsTune]:
            return li;
          default:
            return Xe;
        }
      }
    }
    class Tt {
      /**
       * MoveDownTune constructor
       *
       * @param {API} api — Editor's API
       */
      constructor({ api: e }) {
        this.CSS = {
          animation: "wobble"
        }, this.api = e;
      }
      /**
       * Tune's appearance in block settings menu
       */
      render() {
        return {
          icon: ft,
          title: this.api.i18n.t("Move down"),
          onActivate: () => this.handleClick(),
          name: "move-down"
        };
      }
      /**
       * Handle clicks on 'move down' button
       */
      handleClick() {
        const e = this.api.blocks.getCurrentBlockIndex(), t = this.api.blocks.getBlockByIndex(e + 1);
        if (!t)
          throw new Error("Unable to move Block down since it is already the last");
        const o = t.holder, i = o.getBoundingClientRect();
        let n = Math.abs(window.innerHeight - o.offsetHeight);
        i.top < window.innerHeight && (n = window.scrollY + o.offsetHeight), window.scrollTo(0, n), this.api.blocks.move(e + 1), this.api.toolbar.toggleBlockSettings(!0);
      }
    }
    Tt.isTune = !0;
    class Ct {
      /**
       * DeleteTune constructor
       *
       * @param {API} api - Editor's API
       */
      constructor({ api: e }) {
        this.api = e;
      }
      /**
       * Tune's appearance in block settings menu
       */
      render() {
        return {
          icon: Mo,
          title: this.api.i18n.t("Delete"),
          name: "delete",
          confirmation: {
            title: this.api.i18n.t("Click to delete"),
            onActivate: () => this.handleClick()
          }
        };
      }
      /**
       * Delete block conditions passed
       */
      handleClick() {
        this.api.blocks.delete();
      }
    }
    Ct.isTune = !0;
    class St {
      /**
       * MoveUpTune constructor
       *
       * @param {API} api - Editor's API
       */
      constructor({ api: e }) {
        this.CSS = {
          animation: "wobble"
        }, this.api = e;
      }
      /**
       * Tune's appearance in block settings menu
       */
      render() {
        return {
          icon: Io,
          title: this.api.i18n.t("Move up"),
          onActivate: () => this.handleClick(),
          name: "move-up"
        };
      }
      /**
       * Move current block up
       */
      handleClick() {
        const e = this.api.blocks.getCurrentBlockIndex(), t = this.api.blocks.getBlockByIndex(e), o = this.api.blocks.getBlockByIndex(e - 1);
        if (e === 0 || !t || !o)
          throw new Error("Unable to move Block up since it is already the first");
        const i = t.holder, n = o.holder, r = i.getBoundingClientRect(), a = n.getBoundingClientRect();
        let l;
        a.top > 0 ? l = Math.abs(r.top) - Math.abs(a.top) : l = Math.abs(r.top) + a.height, window.scrollBy(0, -1 * l), this.api.blocks.move(e - 1), this.api.toolbar.toggleBlockSettings(!0);
      }
    }
    St.isTune = !0;
    var ui = Object.defineProperty, pi = Object.getOwnPropertyDescriptor, fi = (s, e, t, o) => {
      for (var i = o > 1 ? void 0 : o ? pi(e, t) : e, n = s.length - 1, r; n >= 0; n--)
        (r = s[n]) && (i = (o ? r(e, t, i) : r(i)) || i);
      return o && i && ui(e, t, i), i;
    };
    class It extends C {
      constructor() {
        super(...arguments), this.stubTool = "stub", this.toolsAvailable = new U(), this.toolsUnavailable = new U();
      }
      /**
       * Returns available Tools
       */
      get available() {
        return this.toolsAvailable;
      }
      /**
       * Returns unavailable Tools
       */
      get unavailable() {
        return this.toolsUnavailable;
      }
      /**
       * Return Tools for the Inline Toolbar
       */
      get inlineTools() {
        return this.available.inlineTools;
      }
      /**
       * Return editor block tools
       */
      get blockTools() {
        return this.available.blockTools;
      }
      /**
       * Return available Block Tunes
       *
       * @returns {object} - object of Inline Tool's classes
       */
      get blockTunes() {
        return this.available.blockTunes;
      }
      /**
       * Returns default Tool object
       */
      get defaultTool() {
        return this.blockTools.get(this.config.defaultBlock);
      }
      /**
       * Returns internal tools
       */
      get internal() {
        return this.available.internalTools;
      }
      /**
       * Creates instances via passed or default configuration
       *
       * @returns {Promise<void>}
       */
      async prepare() {
        if (this.validateTools(), this.config.tools = Se({}, this.internalTools, this.config.tools), !Object.prototype.hasOwnProperty.call(this.config, "tools") || Object.keys(this.config.tools).length === 0)
          throw Error("Can't start without tools");
        const e = this.prepareConfig();
        this.factory = new hi(e, this.config, this.Editor.API);
        const t = this.getListOfPrepareFunctions(e);
        if (t.length === 0)
          return Promise.resolve();
        await Dt(t, (o) => {
          this.toolPrepareMethodSuccess(o);
        }, (o) => {
          this.toolPrepareMethodFallback(o);
        }), this.prepareBlockTools();
      }
      getAllInlineToolsSanitizeConfig() {
        const e = {};
        return Array.from(this.inlineTools.values()).forEach((t) => {
          Object.assign(e, t.sanitizeConfig);
        }), e;
      }
      /**
       * Calls each Tool reset method to clean up anything set by Tool
       */
      destroy() {
        Object.values(this.available).forEach(async (e) => {
          D(e.reset) && await e.reset();
        });
      }
      /**
       * Returns internal tools
       * Includes Bold, Italic, Link and Paragraph
       */
      get internalTools() {
        return {
          bold: {
            class: We,
            isInternal: !0
          },
          italic: {
            class: Ye,
            isInternal: !0
          },
          link: {
            class: Ke,
            isInternal: !0
          },
          paragraph: {
            class: ri,
            inlineToolbar: !0,
            isInternal: !0
          },
          stub: {
            class: Et,
            isInternal: !0
          },
          moveUp: {
            class: St,
            isInternal: !0
          },
          delete: {
            class: Ct,
            isInternal: !0
          },
          moveDown: {
            class: Tt,
            isInternal: !0
          }
        };
      }
      /**
       * Tool prepare method success callback
       *
       * @param {object} data - append tool to available list
       */
      toolPrepareMethodSuccess(e) {
        const t = this.factory.get(e.toolName);
        if (t.isInline()) {
          const i = ["render", "surround", "checkState"].filter((n) => !t.create()[n]);
          if (i.length) {
            L(
              `Incorrect Inline Tool: ${t.name}. Some of required methods is not implemented %o`,
              "warn",
              i
            ), this.toolsUnavailable.set(t.name, t);
            return;
          }
        }
        this.toolsAvailable.set(t.name, t);
      }
      /**
       * Tool prepare method fail callback
       *
       * @param {object} data - append tool to unavailable list
       */
      toolPrepareMethodFallback(e) {
        this.toolsUnavailable.set(e.toolName, this.factory.get(e.toolName));
      }
      /**
       * Binds prepare function of plugins with user or default config
       *
       * @returns {Array} list of functions that needs to be fired sequentially
       * @param config - tools config
       */
      getListOfPrepareFunctions(e) {
        const t = [];
        return Object.entries(e).forEach(([o, i]) => {
          t.push({
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            function: D(i.class.prepare) ? i.class.prepare : () => {
            },
            data: {
              toolName: o,
              config: i.config
            }
          });
        }), t;
      }
      /**
       * Assign enabled Inline Tools and Block Tunes for Block Tool
       */
      prepareBlockTools() {
        Array.from(this.blockTools.values()).forEach((e) => {
          this.assignInlineToolsToBlockTool(e), this.assignBlockTunesToBlockTool(e);
        });
      }
      /**
       * Assign enabled Inline Tools for Block Tool
       *
       * @param tool - Block Tool
       */
      assignInlineToolsToBlockTool(e) {
        if (this.config.inlineToolbar !== !1) {
          if (e.enabledInlineTools === !0) {
            e.inlineTools = new U(
              Array.isArray(this.config.inlineToolbar) ? this.config.inlineToolbar.map((t) => [t, this.inlineTools.get(t)]) : Array.from(this.inlineTools.entries())
            );
            return;
          }
          Array.isArray(e.enabledInlineTools) && (e.inlineTools = new U(
            e.enabledInlineTools.map((t) => [t, this.inlineTools.get(t)])
          ));
        }
      }
      /**
       * Assign enabled Block Tunes for Block Tool
       *
       * @param tool — Block Tool
       */
      assignBlockTunesToBlockTool(e) {
        if (e.enabledBlockTunes !== !1) {
          if (Array.isArray(e.enabledBlockTunes)) {
            const t = new U(
              e.enabledBlockTunes.map((o) => [o, this.blockTunes.get(o)])
            );
            e.tunes = new U([...t, ...this.blockTunes.internalTools]);
            return;
          }
          if (Array.isArray(this.config.tunes)) {
            const t = new U(
              this.config.tunes.map((o) => [o, this.blockTunes.get(o)])
            );
            e.tunes = new U([...t, ...this.blockTunes.internalTools]);
            return;
          }
          e.tunes = this.blockTunes.internalTools;
        }
      }
      /**
       * Validate Tools configuration objects and throw Error for user if it is invalid
       */
      validateTools() {
        for (const e in this.config.tools)
          if (Object.prototype.hasOwnProperty.call(this.config.tools, e)) {
            if (e in this.internalTools)
              return;
            const t = this.config.tools[e];
            if (!D(t) && !D(t.class))
              throw Error(
                `Tool «${e}» must be a constructor function or an object with function in the «class» property`
              );
          }
      }
      /**
       * Unify tools config
       */
      prepareConfig() {
        const e = {};
        for (const t in this.config.tools)
          z(this.config.tools[t]) ? e[t] = this.config.tools[t] : e[t] = { class: this.config.tools[t] };
        return e;
      }
    }
    fi([
      ce
    ], It.prototype, "getAllInlineToolsSanitizeConfig", 1);
    const gi = `:root{--selectionColor: #e1f2ff;--inlineSelectionColor: #d4ecff;--bg-light: #eff2f5;--grayText: #707684;--color-dark: #1D202B;--color-active-icon: #388AE5;--color-gray-border: rgba(201, 201, 204, .48);--content-width: 650px;--narrow-mode-right-padding: 50px;--toolbox-buttons-size: 26px;--toolbox-buttons-size--mobile: 36px;--icon-size: 20px;--icon-size--mobile: 28px;--block-padding-vertical: .4em;--color-line-gray: #EFF0F1 }.codex-editor{position:relative;-webkit-box-sizing:border-box;box-sizing:border-box;z-index:1}.codex-editor .hide{display:none}.codex-editor__redactor [contenteditable]:empty:after{content:"\\feff"}@media (min-width: 651px){.codex-editor--narrow .codex-editor__redactor{margin-right:50px}}@media (min-width: 651px){.codex-editor--narrow.codex-editor--rtl .codex-editor__redactor{margin-left:50px;margin-right:0}}@media (min-width: 651px){.codex-editor--narrow .ce-toolbar__actions{right:-5px}}.codex-editor-copyable{position:absolute;height:1px;width:1px;top:-400%;opacity:.001}.codex-editor-overlay{position:fixed;top:0px;left:0px;right:0px;bottom:0px;z-index:999;pointer-events:none;overflow:hidden}.codex-editor-overlay__container{position:relative;pointer-events:auto;z-index:0}.codex-editor-overlay__rectangle{position:absolute;pointer-events:none;background-color:#2eaadc33;border:1px solid transparent}.codex-editor svg{max-height:100%}.codex-editor path{stroke:currentColor}.codex-editor ::-moz-selection{background-color:#d4ecff}.codex-editor ::selection{background-color:#d4ecff}.codex-editor--toolbox-opened [contentEditable=true][data-placeholder]:focus:before{opacity:0!important}.ce-scroll-locked{overflow:hidden}.ce-scroll-locked--hard{overflow:hidden;top:calc(-1 * var(--window-scroll-offset));position:fixed;width:100%}.ce-toolbar{position:absolute;left:0;right:0;top:0;-webkit-transition:opacity .1s ease;transition:opacity .1s ease;will-change:opacity,top;display:none}.ce-toolbar--opened{display:block}.ce-toolbar__content{max-width:650px;margin:0 auto;position:relative}.ce-toolbar__plus{color:#1d202b;cursor:pointer;width:26px;height:26px;border-radius:7px;display:-webkit-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-ms-flex-negative:0;flex-shrink:0}@media (max-width: 650px){.ce-toolbar__plus{width:36px;height:36px}}@media (hover: hover){.ce-toolbar__plus:hover{background-color:#eff2f5}}.ce-toolbar__plus--active{background-color:#eff2f5;-webkit-animation:bounceIn .75s 1;animation:bounceIn .75s 1;-webkit-animation-fill-mode:forwards;animation-fill-mode:forwards}.ce-toolbar__plus-shortcut{opacity:.6;word-spacing:-2px;margin-top:5px}@media (max-width: 650px){.ce-toolbar__plus{position:absolute;background-color:#fff;border:1px solid #E8E8EB;-webkit-box-shadow:0 3px 15px -3px rgba(13,20,33,.13);box-shadow:0 3px 15px -3px #0d142121;border-radius:6px;z-index:2;position:static}.ce-toolbar__plus--left-oriented:before{left:15px;margin-left:0}.ce-toolbar__plus--right-oriented:before{left:auto;right:15px;margin-left:0}}.ce-toolbar__actions{position:absolute;right:100%;opacity:0;display:-webkit-box;display:-ms-flexbox;display:flex;padding-right:5px}.ce-toolbar__actions--opened{opacity:1}@media (max-width: 650px){.ce-toolbar__actions{right:auto}}.ce-toolbar__settings-btn{color:#1d202b;width:26px;height:26px;border-radius:7px;display:-webkit-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;margin-left:3px;cursor:pointer;user-select:none}@media (max-width: 650px){.ce-toolbar__settings-btn{width:36px;height:36px}}@media (hover: hover){.ce-toolbar__settings-btn:hover{background-color:#eff2f5}}.ce-toolbar__settings-btn--active{background-color:#eff2f5;-webkit-animation:bounceIn .75s 1;animation:bounceIn .75s 1;-webkit-animation-fill-mode:forwards;animation-fill-mode:forwards}@media (min-width: 651px){.ce-toolbar__settings-btn{width:24px}}.ce-toolbar__settings-btn--hidden{display:none}@media (max-width: 650px){.ce-toolbar__settings-btn{position:absolute;background-color:#fff;border:1px solid #E8E8EB;-webkit-box-shadow:0 3px 15px -3px rgba(13,20,33,.13);box-shadow:0 3px 15px -3px #0d142121;border-radius:6px;z-index:2;position:static}.ce-toolbar__settings-btn--left-oriented:before{left:15px;margin-left:0}.ce-toolbar__settings-btn--right-oriented:before{left:auto;right:15px;margin-left:0}}.ce-toolbar__plus svg,.ce-toolbar__settings-btn svg{width:24px;height:24px}@media (min-width: 651px){.codex-editor--narrow .ce-toolbar__plus{left:5px}}@media (min-width: 651px){.codex-editor--narrow .ce-toolbox .ce-popover{right:0;left:auto;left:initial}}.ce-inline-toolbar{--y-offset: 8px;position:absolute;background-color:#fff;border:1px solid #E8E8EB;-webkit-box-shadow:0 3px 15px -3px rgba(13,20,33,.13);box-shadow:0 3px 15px -3px #0d142121;border-radius:6px;z-index:2;-webkit-transform:translateX(-50%) translateY(8px) scale(.94);transform:translate(-50%) translateY(8px) scale(.94);opacity:0;visibility:hidden;-webkit-transition:opacity .25s ease,-webkit-transform .15s ease;transition:opacity .25s ease,-webkit-transform .15s ease;transition:transform .15s ease,opacity .25s ease;transition:transform .15s ease,opacity .25s ease,-webkit-transform .15s ease;will-change:transform,opacity;top:0;left:0;z-index:3}.ce-inline-toolbar--left-oriented:before{left:15px;margin-left:0}.ce-inline-toolbar--right-oriented:before{left:auto;right:15px;margin-left:0}.ce-inline-toolbar--showed{opacity:1;visibility:visible;-webkit-transform:translateX(-50%);transform:translate(-50%)}.ce-inline-toolbar--left-oriented{-webkit-transform:translateX(-23px) translateY(8px) scale(.94);transform:translate(-23px) translateY(8px) scale(.94)}.ce-inline-toolbar--left-oriented.ce-inline-toolbar--showed{-webkit-transform:translateX(-23px);transform:translate(-23px)}.ce-inline-toolbar--right-oriented{-webkit-transform:translateX(-100%) translateY(8px) scale(.94);transform:translate(-100%) translateY(8px) scale(.94);margin-left:23px}.ce-inline-toolbar--right-oriented.ce-inline-toolbar--showed{-webkit-transform:translateX(-100%);transform:translate(-100%)}.ce-inline-toolbar [hidden]{display:none!important}.ce-inline-toolbar__toggler-and-button-wrapper{display:-webkit-box;display:-ms-flexbox;display:flex;width:100%;padding:0 6px}.ce-inline-toolbar__buttons{display:-webkit-box;display:-ms-flexbox;display:flex}.ce-inline-toolbar__dropdown{display:-webkit-box;display:-ms-flexbox;display:flex;padding:6px;margin:0 6px 0 -6px;-webkit-box-align:center;-ms-flex-align:center;align-items:center;cursor:pointer;border-right:1px solid rgba(201,201,204,.48);-webkit-box-sizing:border-box;box-sizing:border-box}@media (hover: hover){.ce-inline-toolbar__dropdown:hover{background:#eff2f5}}.ce-inline-toolbar__dropdown--hidden{display:none}.ce-inline-toolbar__dropdown-content,.ce-inline-toolbar__dropdown-arrow{display:-webkit-box;display:-ms-flexbox;display:flex}.ce-inline-toolbar__dropdown-content svg,.ce-inline-toolbar__dropdown-arrow svg{width:20px;height:20px}.ce-inline-toolbar__shortcut{opacity:.6;word-spacing:-3px;margin-top:3px}.ce-inline-tool{display:-webkit-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;padding:6px 1px;cursor:pointer;border:0;outline:none;background-color:transparent;vertical-align:bottom;color:inherit;margin:0;border-radius:0;line-height:normal}.ce-inline-tool svg{width:20px;height:20px}@media (max-width: 650px){.ce-inline-tool svg{width:28px;height:28px}}@media (hover: hover){.ce-inline-tool:hover{background-color:#eff2f5}}.ce-inline-tool--active{color:#388ae5}.ce-inline-tool--focused{background:rgba(34,186,255,.08)!important}.ce-inline-tool--focused{-webkit-box-shadow:inset 0 0 0px 1px rgba(7,161,227,.08);box-shadow:inset 0 0 0 1px #07a1e314}.ce-inline-tool--focused-animated{-webkit-animation-name:buttonClicked;animation-name:buttonClicked;-webkit-animation-duration:.25s;animation-duration:.25s}.ce-inline-tool--link .icon--unlink,.ce-inline-tool--unlink .icon--link{display:none}.ce-inline-tool--unlink .icon--unlink{display:inline-block;margin-bottom:-1px}.ce-inline-tool-input{outline:none;border:0;border-radius:0 0 4px 4px;margin:0;font-size:13px;padding:10px;width:100%;-webkit-box-sizing:border-box;box-sizing:border-box;display:none;font-weight:500;border-top:1px solid rgba(201,201,204,.48);-webkit-appearance:none;font-family:inherit}@media (max-width: 650px){.ce-inline-tool-input{font-size:15px;font-weight:500}}.ce-inline-tool-input::-webkit-input-placeholder{color:#707684}.ce-inline-tool-input::-moz-placeholder{color:#707684}.ce-inline-tool-input:-ms-input-placeholder{color:#707684}.ce-inline-tool-input::-ms-input-placeholder{color:#707684}.ce-inline-tool-input::placeholder{color:#707684}.ce-inline-tool-input--showed{display:block}.ce-conversion-toolbar{position:absolute;background-color:#fff;border:1px solid #E8E8EB;-webkit-box-shadow:0 3px 15px -3px rgba(13,20,33,.13);box-shadow:0 3px 15px -3px #0d142121;border-radius:6px;z-index:2;opacity:0;visibility:hidden;will-change:transform,opacity;-webkit-transition:opacity .1s ease,-webkit-transform .1s ease;transition:opacity .1s ease,-webkit-transform .1s ease;transition:transform .1s ease,opacity .1s ease;transition:transform .1s ease,opacity .1s ease,-webkit-transform .1s ease;-webkit-transform:translateY(-8px);transform:translateY(-8px);left:-1px;width:190px;margin-top:5px;-webkit-box-sizing:content-box;box-sizing:content-box}.ce-conversion-toolbar--left-oriented:before{left:15px;margin-left:0}.ce-conversion-toolbar--right-oriented:before{left:auto;right:15px;margin-left:0}.ce-conversion-toolbar--showed{opacity:1;visibility:visible;-webkit-transform:none;transform:none}.ce-conversion-toolbar [hidden]{display:none!important}.ce-conversion-toolbar__buttons{display:-webkit-box;display:-ms-flexbox;display:flex}.ce-conversion-toolbar__label{color:#707684;font-size:11px;font-weight:500;letter-spacing:.33px;padding:10px 10px 5px;text-transform:uppercase}.ce-conversion-tool{display:-webkit-box;display:-ms-flexbox;display:flex;padding:5px 10px;font-size:14px;line-height:20px;font-weight:500;cursor:pointer;-webkit-box-align:center;-ms-flex-align:center;align-items:center}.ce-conversion-tool--hidden{display:none}.ce-conversion-tool--focused{background:rgba(34,186,255,.08)!important}.ce-conversion-tool--focused{-webkit-box-shadow:inset 0 0 0px 1px rgba(7,161,227,.08);box-shadow:inset 0 0 0 1px #07a1e314}.ce-conversion-tool--focused-animated{-webkit-animation-name:buttonClicked;animation-name:buttonClicked;-webkit-animation-duration:.25s;animation-duration:.25s}.ce-conversion-tool:hover{background:#eff2f5}.ce-conversion-tool__icon{display:-webkit-inline-box;display:-ms-inline-flexbox;display:inline-flex;width:26px;height:26px;-webkit-box-shadow:0 0 0 1px rgba(201,201,204,.48);box-shadow:0 0 0 1px #c9c9cc7a;border-radius:5px;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;background:#fff;-webkit-box-sizing:content-box;box-sizing:content-box;-ms-flex-negative:0;flex-shrink:0;margin-right:10px}.ce-conversion-tool__icon svg{width:20px;height:20px}@media (max-width: 650px){.ce-conversion-tool__icon{width:36px;height:36px;border-radius:8px}.ce-conversion-tool__icon svg{width:28px;height:28px}}.ce-conversion-tool--last{margin-right:0!important}.ce-conversion-tool--active{color:#388ae5!important}.ce-conversion-tool--active{-webkit-animation:bounceIn .75s 1;animation:bounceIn .75s 1;-webkit-animation-fill-mode:forwards;animation-fill-mode:forwards}.ce-conversion-tool__secondary-label{color:#707684;font-size:12px;margin-left:auto;white-space:nowrap;letter-spacing:-.1em;padding-right:5px;margin-bottom:-2px;opacity:.6}@media (max-width: 650px){.ce-conversion-tool__secondary-label{display:none}}.ce-settings__button{display:-webkit-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;padding:6px 1px;border-radius:3px;cursor:pointer;border:0;outline:none;background-color:transparent;vertical-align:bottom;color:inherit;margin:0;line-height:32px}.ce-settings__button svg{width:20px;height:20px}@media (max-width: 650px){.ce-settings__button svg{width:28px;height:28px}}@media (hover: hover){.ce-settings__button:hover{background-color:#eff2f5}}.ce-settings__button--active{color:#388ae5}.ce-settings__button--focused{background:rgba(34,186,255,.08)!important}.ce-settings__button--focused{-webkit-box-shadow:inset 0 0 0px 1px rgba(7,161,227,.08);box-shadow:inset 0 0 0 1px #07a1e314}.ce-settings__button--focused-animated{-webkit-animation-name:buttonClicked;animation-name:buttonClicked;-webkit-animation-duration:.25s;animation-duration:.25s}.ce-settings__button:not(:nth-child(3n+3)){margin-right:3px}.ce-settings__button:nth-child(n+4){margin-top:3px}.ce-settings__button--disabled{cursor:not-allowed!important}.ce-settings__button--disabled{opacity:.3}.ce-settings__button--selected{color:#388ae5}@media (min-width: 651px){.codex-editor--narrow .ce-settings .ce-popover{right:0;left:auto;left:initial}}@-webkit-keyframes fade-in{0%{opacity:0}to{opacity:1}}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.ce-block{-webkit-animation:fade-in .3s ease;animation:fade-in .3s ease;-webkit-animation-fill-mode:none;animation-fill-mode:none;-webkit-animation-fill-mode:initial;animation-fill-mode:initial}.ce-block:first-of-type{margin-top:0}.ce-block--selected .ce-block__content{background:#e1f2ff}.ce-block--selected .ce-block__content [contenteditable]{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.ce-block--selected .ce-block__content img,.ce-block--selected .ce-block__content .ce-stub{opacity:.55}.ce-block--stretched .ce-block__content{max-width:none}.ce-block__content{position:relative;max-width:650px;margin:0 auto;-webkit-transition:background-color .15s ease;transition:background-color .15s ease}.ce-block--drop-target .ce-block__content:before{content:"";position:absolute;top:100%;left:-20px;margin-top:-1px;height:8px;width:8px;border:solid #388AE5;border-width:1px 1px 0 0;-webkit-transform-origin:right;transform-origin:right;-webkit-transform:rotate(45deg);transform:rotate(45deg)}.ce-block--drop-target .ce-block__content:after{content:"";position:absolute;top:100%;height:1px;width:100%;color:#388ae5;background:repeating-linear-gradient(90deg,#388AE5,#388AE5 1px,#fff 1px,#fff 6px)}.ce-block a{cursor:pointer;-webkit-text-decoration:underline;text-decoration:underline}.ce-block b{font-weight:700}.ce-block i{font-style:italic}@media (min-width: 651px){.codex-editor--narrow .ce-block--focused{margin-right:-50px;padding-right:50px}}@-webkit-keyframes bounceIn{0%,20%,40%,60%,80%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{-webkit-transform:scale3d(.9,.9,.9);transform:scale3d(.9,.9,.9)}20%{-webkit-transform:scale3d(1.03,1.03,1.03);transform:scale3d(1.03,1.03,1.03)}60%{-webkit-transform:scale3d(1,1,1);transform:scaleZ(1)}}@keyframes bounceIn{0%,20%,40%,60%,80%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{-webkit-transform:scale3d(.9,.9,.9);transform:scale3d(.9,.9,.9)}20%{-webkit-transform:scale3d(1.03,1.03,1.03);transform:scale3d(1.03,1.03,1.03)}60%{-webkit-transform:scale3d(1,1,1);transform:scaleZ(1)}}@-webkit-keyframes selectionBounce{0%,20%,40%,60%,80%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}50%{-webkit-transform:scale3d(1.01,1.01,1.01);transform:scale3d(1.01,1.01,1.01)}70%{-webkit-transform:scale3d(1,1,1);transform:scaleZ(1)}}@keyframes selectionBounce{0%,20%,40%,60%,80%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}50%{-webkit-transform:scale3d(1.01,1.01,1.01);transform:scale3d(1.01,1.01,1.01)}70%{-webkit-transform:scale3d(1,1,1);transform:scaleZ(1)}}@-webkit-keyframes buttonClicked{0%,20%,40%,60%,80%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{-webkit-transform:scale3d(.95,.95,.95);transform:scale3d(.95,.95,.95)}60%{-webkit-transform:scale3d(1.02,1.02,1.02);transform:scale3d(1.02,1.02,1.02)}80%{-webkit-transform:scale3d(1,1,1);transform:scaleZ(1)}}@keyframes buttonClicked{0%,20%,40%,60%,80%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{-webkit-transform:scale3d(.95,.95,.95);transform:scale3d(.95,.95,.95)}60%{-webkit-transform:scale3d(1.02,1.02,1.02);transform:scale3d(1.02,1.02,1.02)}80%{-webkit-transform:scale3d(1,1,1);transform:scaleZ(1)}}.cdx-block{padding:.4em 0}.cdx-block::-webkit-input-placeholder{line-height:normal!important}.cdx-input{border:1px solid rgba(201,201,204,.48);-webkit-box-shadow:inset 0 1px 2px 0 rgba(35,44,72,.06);box-shadow:inset 0 1px 2px #232c480f;border-radius:3px;padding:10px 12px;outline:none;width:100%;-webkit-box-sizing:border-box;box-sizing:border-box}.cdx-input[data-placeholder]:before{position:static!important}.cdx-input[data-placeholder]:before{display:inline-block;width:0;white-space:nowrap;pointer-events:none}.cdx-settings-button{display:-webkit-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;padding:6px 1px;border-radius:3px;cursor:pointer;border:0;outline:none;background-color:transparent;vertical-align:bottom;color:inherit;margin:0;min-width:26px;min-height:26px}.cdx-settings-button svg{width:20px;height:20px}@media (max-width: 650px){.cdx-settings-button svg{width:28px;height:28px}}@media (hover: hover){.cdx-settings-button:hover{background-color:#eff2f5}}.cdx-settings-button--focused{background:rgba(34,186,255,.08)!important}.cdx-settings-button--focused{-webkit-box-shadow:inset 0 0 0px 1px rgba(7,161,227,.08);box-shadow:inset 0 0 0 1px #07a1e314}.cdx-settings-button--focused-animated{-webkit-animation-name:buttonClicked;animation-name:buttonClicked;-webkit-animation-duration:.25s;animation-duration:.25s}.cdx-settings-button--active{color:#388ae5}.cdx-settings-button svg{width:auto;height:auto}@media (max-width: 650px){.cdx-settings-button{width:36px;height:36px;border-radius:8px}}.cdx-loader{position:relative;border:1px solid rgba(201,201,204,.48)}.cdx-loader:before{content:"";position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-11px 0 0 -11px;border:2px solid rgba(201,201,204,.48);border-left-color:#388ae5;border-radius:50%;-webkit-animation:cdxRotation 1.2s infinite linear;animation:cdxRotation 1.2s infinite linear}@-webkit-keyframes cdxRotation{0%{-webkit-transform:rotate(0deg);transform:rotate(0)}to{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}@keyframes cdxRotation{0%{-webkit-transform:rotate(0deg);transform:rotate(0)}to{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}.cdx-button{padding:13px;border-radius:3px;border:1px solid rgba(201,201,204,.48);font-size:14.9px;background:#fff;-webkit-box-shadow:0 2px 2px 0 rgba(18,30,57,.04);box-shadow:0 2px 2px #121e390a;color:#707684;text-align:center;cursor:pointer}@media (hover: hover){.cdx-button:hover{background:#FBFCFE;-webkit-box-shadow:0 1px 3px 0 rgba(18,30,57,.08);box-shadow:0 1px 3px #121e3914}}.cdx-button svg{height:20px;margin-right:.2em;margin-top:-2px}.ce-stub{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:12px 18px;margin:10px 0;border-radius:10px;background:#eff2f5;border:1px solid #EFF0F1;color:#707684;font-size:14px}.ce-stub svg{width:20px;height:20px}.ce-stub__info{margin-left:14px}.ce-stub__title{font-weight:500;text-transform:capitalize}.codex-editor.codex-editor--rtl{direction:rtl}.codex-editor.codex-editor--rtl .cdx-list{padding-left:0;padding-right:40px}.codex-editor.codex-editor--rtl .ce-toolbar__plus{right:-26px;left:auto}.codex-editor.codex-editor--rtl .ce-toolbar__actions{right:auto;left:-26px}@media (max-width: 650px){.codex-editor.codex-editor--rtl .ce-toolbar__actions{margin-left:0;margin-right:auto;padding-right:0;padding-left:10px}}.codex-editor.codex-editor--rtl .ce-settings{left:5px;right:auto}.codex-editor.codex-editor--rtl .ce-settings:before{right:auto;left:25px}.codex-editor.codex-editor--rtl .ce-settings__button:not(:nth-child(3n+3)){margin-left:3px;margin-right:0}.codex-editor.codex-editor--rtl .ce-conversion-tool__icon{margin-right:0;margin-left:10px}.codex-editor.codex-editor--rtl .ce-inline-toolbar__dropdown{border-right:0px solid transparent;border-left:1px solid rgba(201,201,204,.48);margin:0 -6px 0 6px}.codex-editor.codex-editor--rtl .ce-inline-toolbar__dropdown .icon--toggler-down{margin-left:0;margin-right:4px}@media (min-width: 651px){.codex-editor--narrow.codex-editor--rtl .ce-toolbar__plus{left:0px;right:5px}}@media (min-width: 651px){.codex-editor--narrow.codex-editor--rtl .ce-toolbar__actions{left:-5px}}.cdx-search-field{--icon-margin-right: 10px;background:rgba(232,232,235,.49);border:1px solid rgba(226,226,229,.2);border-radius:6px;padding:2px;display:grid;grid-template-columns:auto auto 1fr;grid-template-rows:auto}.cdx-search-field__icon{width:26px;height:26px;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;margin-right:var(--icon-margin-right)}.cdx-search-field__icon svg{width:20px;height:20px;color:#707684}.cdx-search-field__input{font-size:14px;outline:none;font-weight:500;font-family:inherit;border:0;background:transparent;margin:0;padding:0;line-height:22px;min-width:calc(100% - 26px - var(--icon-margin-right))}.cdx-search-field__input::-webkit-input-placeholder{color:#707684;font-weight:500}.cdx-search-field__input::-moz-placeholder{color:#707684;font-weight:500}.cdx-search-field__input:-ms-input-placeholder{color:#707684;font-weight:500}.cdx-search-field__input::-ms-input-placeholder{color:#707684;font-weight:500}.cdx-search-field__input::placeholder{color:#707684;font-weight:500}.ce-popover{--border-radius: 6px;--width: 200px;--max-height: 270px;--padding: 6px;--offset-from-target: 8px;--color-border: #e8e8eb;--color-shadow: rgba(13,20,33,.13);--color-background: white;--color-text-primary: black;--color-text-secondary: #707684;--color-border-icon: rgba(201, 201, 204, .48);--color-border-icon-disabled: #EFF0F1;--color-text-icon-active: #388AE5;--color-background-icon-active: rgba(56, 138, 229, .1);--color-background-item-focus: rgba(34, 186, 255, .08);--color-shadow-item-focus: rgba(7, 161, 227, .08);--color-background-item-hover: #eff2f5;--color-background-item-confirm: #E24A4A;--color-background-item-confirm-hover: #CE4343;min-width:var(--width);width:var(--width);max-height:var(--max-height);border-radius:var(--border-radius);overflow:hidden;-webkit-box-sizing:border-box;box-sizing:border-box;-webkit-box-shadow:0 3px 15px -3px var(--color-shadow);box-shadow:0 3px 15px -3px var(--color-shadow);position:absolute;left:0;top:calc(100% + var(--offset-from-target));background:var(--color-background);display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;z-index:4;opacity:0;max-height:0;pointer-events:none;padding:0;border:none}.ce-popover--opened{opacity:1;padding:var(--padding);max-height:var(--max-height);pointer-events:auto;-webkit-animation:panelShowing .1s ease;animation:panelShowing .1s ease;border:1px solid var(--color-border)}@media (max-width: 650px){.ce-popover--opened{-webkit-animation:panelShowingMobile .25s ease;animation:panelShowingMobile .25s ease}}.ce-popover__items{overflow-y:auto;-ms-scroll-chaining:none;overscroll-behavior:contain}@media (max-width: 650px){.ce-popover__overlay{position:fixed;top:0;bottom:0;left:0;right:0;background:#1D202B;z-index:3;opacity:.5;-webkit-transition:opacity .12s ease-in;transition:opacity .12s ease-in;will-change:opacity;visibility:visible}}.ce-popover__overlay--hidden{display:none}.ce-popover--open-top{top:calc(-1 * (var(--offset-from-target) + var(--popover-height)))}@media (max-width: 650px){.ce-popover{--offset: 5px;position:fixed;max-width:none;min-width:calc(100% - var(--offset) * 2);left:var(--offset);right:var(--offset);bottom:calc(var(--offset) + env(safe-area-inset-bottom));top:auto;border-radius:10px}.ce-popover .ce-popover__search{display:none}}.ce-popover__search,.ce-popover__custom-content:not(:empty){margin-bottom:5px}.ce-popover__nothing-found-message{color:#707684;display:none;cursor:default;padding:3px;font-size:14px;line-height:20px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ce-popover__nothing-found-message--displayed{display:block}.ce-popover__custom-content:not(:empty){padding:4px}@media (min-width: 651px){.ce-popover__custom-content:not(:empty){padding:0}}.ce-popover__custom-content--hidden{display:none}.ce-popover-item{--border-radius: 6px;--icon-size: 20px;--icon-size-mobile: 28px;border-radius:var(--border-radius);display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:3px;color:var(--color-text-primary);-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}@media (max-width: 650px){.ce-popover-item{padding:4px}}.ce-popover-item:not(:last-of-type){margin-bottom:1px}.ce-popover-item__icon{border-radius:5px;width:26px;height:26px;-webkit-box-shadow:0 0 0 1px var(--color-border-icon);box-shadow:0 0 0 1px var(--color-border-icon);background:#fff;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;margin-right:10px}.ce-popover-item__icon svg{width:20px;height:20px}@media (max-width: 650px){.ce-popover-item__icon{width:36px;height:36px;border-radius:8px}.ce-popover-item__icon svg{width:var(--icon-size-mobile);height:var(--icon-size-mobile)}}.ce-popover-item__title{font-size:14px;line-height:20px;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}@media (max-width: 650px){.ce-popover-item__title{font-size:16px}}.ce-popover-item__secondary-title{color:var(--color-text-secondary);font-size:12px;margin-left:auto;white-space:nowrap;letter-spacing:-.1em;padding-right:5px;margin-bottom:-2px;opacity:.6}@media (max-width: 650px){.ce-popover-item__secondary-title{display:none}}.ce-popover-item--active{background:var(--color-background-icon-active);color:var(--color-text-icon-active)}.ce-popover-item--active .ce-popover-item__icon{-webkit-box-shadow:none;box-shadow:none}.ce-popover-item--disabled{color:var(--color-text-secondary);cursor:default;pointer-events:none}.ce-popover-item--disabled .ce-popover-item__icon{-webkit-box-shadow:0 0 0 1px var(--color-border-icon-disabled);box-shadow:0 0 0 1px var(--color-border-icon-disabled)}.ce-popover-item--focused:not(.ce-popover-item--no-focus){background:var(--color-background-item-focus)!important}.ce-popover-item--focused:not(.ce-popover-item--no-focus){-webkit-box-shadow:inset 0 0 0px 1px var(--color-shadow-item-focus);box-shadow:inset 0 0 0 1px var(--color-shadow-item-focus)}.ce-popover-item--hidden{display:none}@media (hover: hover){.ce-popover-item:hover{cursor:pointer}.ce-popover-item:hover:not(.ce-popover-item--no-hover){background-color:var(--color-background-item-hover)}.ce-popover-item:hover .ce-popover-item__icon{-webkit-box-shadow:none;box-shadow:none}}.ce-popover-item--confirmation{background:var(--color-background-item-confirm)}.ce-popover-item--confirmation .ce-popover-item__icon{color:var(--color-background-item-confirm)}.ce-popover-item--confirmation .ce-popover-item__title{color:#fff}@media (hover: hover){.ce-popover-item--confirmation:not(.ce-popover-item--no-hover):hover{background:var(--color-background-item-confirm-hover)}}.ce-popover-item--confirmation:not(.ce-popover-item--no-focus).ce-popover-item--focused{background:var(--color-background-item-confirm-hover)!important}.ce-popover-item--confirmation .ce-popover-item__icon,.ce-popover-item--active .ce-popover-item__icon,.ce-popover-item--focused .ce-popover-item__icon{-webkit-box-shadow:none;box-shadow:none}@-webkit-keyframes panelShowing{0%{opacity:0;-webkit-transform:translateY(-8px) scale(.9);transform:translateY(-8px) scale(.9)}70%{opacity:1;-webkit-transform:translateY(2px);transform:translateY(2px)}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes panelShowing{0%{opacity:0;-webkit-transform:translateY(-8px) scale(.9);transform:translateY(-8px) scale(.9)}70%{opacity:1;-webkit-transform:translateY(2px);transform:translateY(2px)}to{-webkit-transform:translateY(0);transform:translateY(0)}}@-webkit-keyframes panelShowingMobile{0%{opacity:0;-webkit-transform:translateY(14px) scale(.98);transform:translateY(14px) scale(.98)}70%{opacity:1;-webkit-transform:translateY(-4px);transform:translateY(-4px)}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes panelShowingMobile{0%{opacity:0;-webkit-transform:translateY(14px) scale(.98);transform:translateY(14px) scale(.98)}70%{opacity:1;-webkit-transform:translateY(-4px);transform:translateY(-4px)}to{-webkit-transform:translateY(0);transform:translateY(0)}}.wobble{-webkit-animation-name:wobble;animation-name:wobble;-webkit-animation-duration:.4s;animation-duration:.4s}@-webkit-keyframes wobble{0%{-webkit-transform:translate3d(0,0,0);transform:translateZ(0)}15%{-webkit-transform:translate3d(-9%,0,0);transform:translate3d(-9%,0,0)}30%{-webkit-transform:translate3d(9%,0,0);transform:translate3d(9%,0,0)}45%{-webkit-transform:translate3d(-4%,0,0);transform:translate3d(-4%,0,0)}60%{-webkit-transform:translate3d(4%,0,0);transform:translate3d(4%,0,0)}75%{-webkit-transform:translate3d(-1%,0,0);transform:translate3d(-1%,0,0)}to{-webkit-transform:translate3d(0,0,0);transform:translateZ(0)}}@keyframes wobble{0%{-webkit-transform:translate3d(0,0,0);transform:translateZ(0)}15%{-webkit-transform:translate3d(-9%,0,0);transform:translate3d(-9%,0,0)}30%{-webkit-transform:translate3d(9%,0,0);transform:translate3d(9%,0,0)}45%{-webkit-transform:translate3d(-4%,0,0);transform:translate3d(-4%,0,0)}60%{-webkit-transform:translate3d(4%,0,0);transform:translate3d(4%,0,0)}75%{-webkit-transform:translate3d(-1%,0,0);transform:translate3d(-1%,0,0)}to{-webkit-transform:translate3d(0,0,0);transform:translateZ(0)}}
`;
    class bi extends C {
      constructor() {
        super(...arguments), this.isMobile = !1, this.contentRectCache = void 0, this.resizeDebouncer = Ht(() => {
          this.windowResize();
        }, 200);
      }
      /**
       * Editor.js UI CSS class names
       *
       * @returns {{editorWrapper: string, editorZone: string}}
       */
      get CSS() {
        return {
          editorWrapper: "codex-editor",
          editorWrapperNarrow: "codex-editor--narrow",
          editorZone: "codex-editor__redactor",
          editorZoneHidden: "codex-editor__redactor--hidden",
          editorEmpty: "codex-editor--empty",
          editorRtlFix: "codex-editor--rtl"
        };
      }
      /**
       * Return Width of center column of Editor
       *
       * @returns {DOMRect}
       */
      get contentRect() {
        if (this.contentRectCache)
          return this.contentRectCache;
        const e = this.nodes.wrapper.querySelector(`.${F.CSS.content}`);
        return e ? (this.contentRectCache = e.getBoundingClientRect(), this.contentRectCache) : {
          width: 650,
          left: 0,
          right: 0
        };
      }
      /**
       * Making main interface
       */
      async prepare() {
        this.checkIsMobile(), this.make(), this.loadStyles();
      }
      /**
       * Toggle read-only state
       *
       * If readOnly is true:
       *  - removes all listeners from main UI module elements
       *
       * if readOnly is false:
       *  - enables all listeners to UI module elements
       *
       * @param {boolean} readOnlyEnabled - "read only" state
       */
      toggleReadOnly(e) {
        e ? this.disableModuleBindings() : this.enableModuleBindings();
      }
      /**
       * Check if Editor is empty and set CSS class to wrapper
       */
      checkEmptiness() {
        const { BlockManager: e } = this.Editor;
        this.nodes.wrapper.classList.toggle(this.CSS.editorEmpty, e.isEditorEmpty);
      }
      /**
       * Check if one of Toolbar is opened
       * Used to prevent global keydowns (for example, Enter) conflicts with Enter-on-toolbar
       *
       * @returns {boolean}
       */
      get someToolbarOpened() {
        const { Toolbar: e, BlockSettings: t, InlineToolbar: o, ConversionToolbar: i } = this.Editor;
        return t.opened || o.opened || i.opened || e.toolbox.opened;
      }
      /**
       * Check for some Flipper-buttons is under focus
       */
      get someFlipperButtonFocused() {
        return this.Editor.Toolbar.toolbox.hasFocus() ? !0 : Object.entries(this.Editor).filter(([e, t]) => t.flipper instanceof G).some(([e, t]) => t.flipper.hasFocus());
      }
      /**
       * Clean editor`s UI
       */
      destroy() {
        this.nodes.holder.innerHTML = "";
      }
      /**
       * Close all Editor's toolbars
       */
      closeAllToolbars() {
        const { Toolbar: e, BlockSettings: t, InlineToolbar: o, ConversionToolbar: i } = this.Editor;
        t.close(), o.close(), i.close(), e.toolbox.close();
      }
      /**
       * Check for mobile mode and cache a result
       */
      checkIsMobile() {
        this.isMobile = window.innerWidth < rt;
      }
      /**
       * Makes Editor.js interface
       */
      make() {
        this.nodes.holder = d.getHolder(this.config.holder), this.nodes.wrapper = d.make("div", [
          this.CSS.editorWrapper,
          ...this.isRtl ? [this.CSS.editorRtlFix] : []
        ]), this.nodes.redactor = d.make("div", this.CSS.editorZone), this.nodes.holder.offsetWidth < this.contentRect.width && this.nodes.wrapper.classList.add(this.CSS.editorWrapperNarrow), this.nodes.redactor.style.paddingBottom = this.config.minHeight + "px", this.nodes.wrapper.appendChild(this.nodes.redactor), this.nodes.holder.appendChild(this.nodes.wrapper);
      }
      /**
       * Appends CSS
       */
      loadStyles() {
        const e = "editor-js-styles";
        if (d.get(e))
          return;
        const t = d.make("style", null, {
          id: e,
          textContent: gi.toString()
        });
        d.prepend(document.head, t);
      }
      /**
       * Bind events on the Editor.js interface
       */
      enableModuleBindings() {
        this.readOnlyMutableListeners.on(this.nodes.redactor, "click", (e) => {
          this.redactorClicked(e);
        }, !1), this.readOnlyMutableListeners.on(this.nodes.redactor, "mousedown", (e) => {
          this.documentTouched(e);
        }, !0), this.readOnlyMutableListeners.on(this.nodes.redactor, "touchstart", (e) => {
          this.documentTouched(e);
        }, !0), this.readOnlyMutableListeners.on(document, "keydown", (e) => {
          this.documentKeydown(e);
        }, !0), this.readOnlyMutableListeners.on(document, "mousedown", (e) => {
          this.documentClicked(e);
        }, !0), this.readOnlyMutableListeners.on(document, "selectionchange", () => {
          this.selectionChanged();
        }, !0), this.readOnlyMutableListeners.on(window, "resize", () => {
          this.resizeDebouncer();
        }, {
          passive: !0
        }), this.watchBlockHoveredEvents();
      }
      /**
       * Listen redactor mousemove to emit 'block-hovered' event
       */
      watchBlockHoveredEvents() {
        let e;
        this.readOnlyMutableListeners.on(this.nodes.redactor, "mousemove", Ce((t) => {
          const o = t.target.closest(".ce-block");
          this.Editor.BlockSelection.anyBlockSelected || o && e !== o && (e = o, this.eventsDispatcher.emit(kt, {
            block: this.Editor.BlockManager.getBlockByChildNode(o)
          }));
        }, 20), {
          passive: !0
        });
      }
      /**
       * Unbind events on the Editor.js interface
       */
      disableModuleBindings() {
        this.readOnlyMutableListeners.clearAll();
      }
      /**
       * Resize window handler
       */
      windowResize() {
        this.contentRectCache = null, this.checkIsMobile();
      }
      /**
       * All keydowns on document
       *
       * @param {KeyboardEvent} event - keyboard event
       */
      documentKeydown(e) {
        switch (e.keyCode) {
          case B.ENTER:
            this.enterPressed(e);
            break;
          case B.BACKSPACE:
          case B.DELETE:
            this.backspacePressed(e);
            break;
          case B.ESC:
            this.escapePressed(e);
            break;
          default:
            this.defaultBehaviour(e);
            break;
        }
      }
      /**
       * Ignore all other document's keydown events
       *
       * @param {KeyboardEvent} event - keyboard event
       */
      defaultBehaviour(e) {
        const { currentBlock: t } = this.Editor.BlockManager, o = e.target.closest(`.${this.CSS.editorWrapper}`), i = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
        if (t !== void 0 && o === null) {
          this.Editor.BlockEvents.keydown(e);
          return;
        }
        o || t && i || (this.Editor.BlockManager.dropPointer(), this.Editor.Toolbar.close());
      }
      /**
       * @param {KeyboardEvent} event - keyboard event
       */
      backspacePressed(e) {
        const { BlockManager: t, BlockSelection: o, Caret: i } = this.Editor;
        if (o.anyBlockSelected && !m.isSelectionExists) {
          const n = t.removeSelectedBlocks();
          i.setToBlock(t.insertDefaultBlockAtIndex(n, !0), i.positions.START), o.clearSelection(e), e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation();
        }
      }
      /**
       * Escape pressed
       * If some of Toolbar components are opened, then close it otherwise close Toolbar
       *
       * @param {Event} event - escape keydown event
       */
      escapePressed(e) {
        this.Editor.BlockSelection.clearSelection(e), this.Editor.Toolbar.toolbox.opened ? (this.Editor.Toolbar.toolbox.close(), this.Editor.Caret.setToBlock(this.Editor.BlockManager.currentBlock)) : this.Editor.BlockSettings.opened ? this.Editor.BlockSettings.close() : this.Editor.ConversionToolbar.opened ? this.Editor.ConversionToolbar.close() : this.Editor.InlineToolbar.opened ? this.Editor.InlineToolbar.close() : this.Editor.Toolbar.close();
      }
      /**
       * Enter pressed on document
       *
       * @param {KeyboardEvent} event - keyboard event
       */
      enterPressed(e) {
        const { BlockManager: t, BlockSelection: o } = this.Editor, i = t.currentBlockIndex >= 0;
        if (o.anyBlockSelected && !m.isSelectionExists) {
          o.clearSelection(e), e.preventDefault(), e.stopImmediatePropagation(), e.stopPropagation();
          return;
        }
        if (!this.someToolbarOpened && i && e.target.tagName === "BODY") {
          const n = this.Editor.BlockManager.insert();
          this.Editor.Caret.setToBlock(n), this.Editor.BlockManager.highlightCurrentNode(), this.Editor.Toolbar.moveAndOpen(n);
        }
        this.Editor.BlockSelection.clearSelection(e);
      }
      /**
       * All clicks on document
       *
       * @param {MouseEvent} event - Click event
       */
      documentClicked(e) {
        if (!e.isTrusted)
          return;
        const t = e.target;
        this.nodes.holder.contains(t) || m.isAtEditor || (this.Editor.BlockManager.dropPointer(), this.Editor.Toolbar.close());
        const i = this.Editor.BlockSettings.nodes.wrapper.contains(t), n = this.Editor.Toolbar.nodes.settingsToggler.contains(t), r = i || n;
        if (this.Editor.BlockSettings.opened && !r) {
          this.Editor.BlockSettings.close();
          const a = this.Editor.BlockManager.getBlockByChildNode(t);
          this.Editor.Toolbar.moveAndOpen(a);
        }
        this.Editor.BlockSelection.clearSelection(e);
      }
      /**
       * First touch on editor
       * Fired before click
       *
       * Used to change current block — we need to do it before 'selectionChange' event.
       * Also:
       * - Move and show the Toolbar
       * - Set a Caret
       *
       * @param {MouseEvent | TouchEvent} event - touch or mouse event
       */
      documentTouched(e) {
        let t = e.target;
        if (t === this.nodes.redactor) {
          const o = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX, i = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
          t = document.elementFromPoint(o, i);
        }
        try {
          this.Editor.BlockManager.setCurrentBlockByChildNode(t), this.Editor.BlockManager.highlightCurrentNode();
        } catch {
          this.Editor.RectangleSelection.isRectActivated() || this.Editor.Caret.setToTheLastBlock();
        }
        this.Editor.Toolbar.moveAndOpen();
      }
      /**
       * All clicks on the redactor zone
       *
       * @param {MouseEvent} event - click event
       * @description
       * - By clicks on the Editor's bottom zone:
       *      - if last Block is empty, set a Caret to this
       *      - otherwise, add a new empty Block and set a Caret to that
       */
      redactorClicked(e) {
        const { BlockSelection: t } = this.Editor;
        if (!m.isCollapsed)
          return;
        const o = () => {
          e.stopImmediatePropagation(), e.stopPropagation();
        }, i = e.target, n = e.metaKey || e.ctrlKey;
        if (d.isAnchor(i) && n) {
          o();
          const u = i.getAttribute("href"), h = zt(u);
          $t(h);
          return;
        }
        const r = this.Editor.BlockManager.getBlockByIndex(-1), a = d.offset(r.holder).bottom, l = e.pageY;
        if (e.target instanceof Element && e.target.isEqualNode(this.nodes.redactor) && /**
        * If there is cross block selection started, target will be equal to redactor so we need additional check
        */
        !t.anyBlockSelected && /**
        * Prevent caret jumping (to last block) when clicking between blocks
        */
        a < l) {
          o();
          const { BlockManager: u, Caret: h, Toolbar: f } = this.Editor;
          (!u.lastBlock.tool.isDefault || !u.lastBlock.isEmpty) && u.insertAtEnd(), h.setToTheLastBlock(), f.moveAndOpen(u.lastBlock);
        }
      }
      /**
       * Handle selection changes on mobile devices
       * Uses for showing the Inline Toolbar
       */
      selectionChanged() {
        const { CrossBlockSelection: e, BlockSelection: t } = this.Editor, o = m.anchorElement;
        if (e.isCrossBlockSelectionStarted && t.anyBlockSelected && m.get().removeAllRanges(), !o) {
          m.range || this.Editor.InlineToolbar.close();
          return;
        }
        const i = o.closest(`.${F.CSS.content}`) === null;
        if (i && (this.Editor.InlineToolbar.containsNode(o) || this.Editor.InlineToolbar.close(), !(o.dataset.inlineToolbar === "true")))
          return;
        this.Editor.BlockManager.currentBlock || this.Editor.BlockManager.setCurrentBlockByChildNode(o);
        const n = i !== !0;
        this.Editor.InlineToolbar.tryToShow(!0, n);
      }
    }
    const mi = {
      // API Modules
      BlocksAPI: Qt,
      CaretAPI: eo,
      EventsAPI: to,
      I18nAPI: Pe,
      API: oo,
      InlineToolbarAPI: io,
      ListenersAPI: no,
      NotifierAPI: lo,
      ReadOnlyAPI: co,
      SanitizerAPI: mo,
      SaverAPI: ko,
      SelectionAPI: vo,
      StylesAPI: xo,
      ToolbarAPI: wo,
      TooltipAPI: Bo,
      UiAPI: To,
      // Toolbar Modules
      BlockSettings: jo,
      ConversionToolbar: Y,
      Toolbar: Ko,
      InlineToolbar: Xo,
      // Modules
      BlockEvents: Vo,
      BlockManager: Go,
      BlockSelection: Jo,
      Caret: ve,
      CrossBlockSelection: Qo,
      DragNDrop: ei,
      ModificationsObserver: ti,
      Paste: yt,
      ReadOnly: oi,
      RectangleSelection: fe,
      Renderer: ii,
      Saver: ni,
      Tools: It,
      UI: bi
    };
    class ki {
      /**
       * @param {EditorConfig} config - user configuration
       */
      constructor(e) {
        this.moduleInstances = {}, this.eventsDispatcher = new we();
        let t, o;
        this.isReady = new Promise((i, n) => {
          t = i, o = n;
        }), Promise.resolve().then(async () => {
          this.configuration = e, this.validate(), this.init(), await this.start(), await this.render();
          const { BlockManager: i, Caret: n, UI: r, ModificationsObserver: a } = this.moduleInstances;
          r.checkEmptiness(), a.enable(), this.configuration.autofocus && (n.setToBlock(i.blocks[0], n.positions.START), i.highlightCurrentNode()), t();
        }).catch((i) => {
          L(`Editor.js is not ready because of ${i}`, "error"), o(i);
        });
      }
      /**
       * Setting for configuration
       *
       * @param {EditorConfig|string} config - Editor's config to set
       */
      set configuration(e) {
        var o, i;
        z(e) ? this.config = {
          ...e
        } : this.config = {
          holder: e
        }, Ie(!!this.config.holderId, "config.holderId", "config.holder"), this.config.holderId && !this.config.holder && (this.config.holder = this.config.holderId, this.config.holderId = null), this.config.holder == null && (this.config.holder = "editorjs"), this.config.logLevel || (this.config.logLevel = it.VERBOSE), Nt(this.config.logLevel), Ie(!!this.config.initialBlock, "config.initialBlock", "config.defaultBlock"), this.config.defaultBlock = this.config.defaultBlock || this.config.initialBlock || "paragraph", this.config.minHeight = this.config.minHeight !== void 0 ? this.config.minHeight : 300;
        const t = {
          type: this.config.defaultBlock,
          data: {}
        };
        this.config.placeholder = this.config.placeholder || !1, this.config.sanitizer = this.config.sanitizer || {
          p: !0,
          b: !0,
          a: !0
        }, this.config.hideToolbar = this.config.hideToolbar ? this.config.hideToolbar : !1, this.config.tools = this.config.tools || {}, this.config.i18n = this.config.i18n || {}, this.config.data = this.config.data || { blocks: [] }, this.config.onReady = this.config.onReady || (() => {
        }), this.config.onChange = this.config.onChange || (() => {
        }), this.config.inlineToolbar = this.config.inlineToolbar !== void 0 ? this.config.inlineToolbar : !0, (V(this.config.data) || !this.config.data.blocks || this.config.data.blocks.length === 0) && (this.config.data = { blocks: [t] }), this.config.readOnly = this.config.readOnly || !1, (o = this.config.i18n) != null && o.messages && $.setDictionary(this.config.i18n.messages), this.config.i18n.direction = ((i = this.config.i18n) == null ? void 0 : i.direction) || "ltr";
      }
      /**
       * Returns private property
       *
       * @returns {EditorConfig}
       */
      get configuration() {
        return this.config;
      }
      /**
       * Checks for required fields in Editor's config
       */
      validate() {
        const { holderId: e, holder: t } = this.config;
        if (e && t)
          throw Error("«holderId» and «holder» param can't assign at the same time.");
        if (J(t) && !d.get(t))
          throw Error(`element with ID «${t}» is missing. Pass correct holder's ID.`);
        if (t && z(t) && !d.isElement(t))
          throw Error("«holder» value must be an Element node");
      }
      /**
       * Initializes modules:
       *  - make and save instances
       *  - configure
       */
      init() {
        this.constructModules(), this.configureModules();
      }
      /**
       * Start Editor!
       *
       * Get list of modules that needs to be prepared and return a sequence (Promise)
       *
       * @returns {Promise<void>}
       */
      async start() {
        await [
          "Tools",
          "UI",
          "BlockManager",
          "Paste",
          "BlockSelection",
          "RectangleSelection",
          "CrossBlockSelection",
          "ReadOnly"
        ].reduce(
          (t, o) => t.then(async () => {
            try {
              await this.moduleInstances[o].prepare();
            } catch (i) {
              if (i instanceof lt)
                throw new Error(i.message);
              L(`Module ${o} was skipped because of %o`, "warn", i);
            }
          }),
          Promise.resolve()
        );
      }
      /**
       * Render initial data
       */
      render() {
        return this.moduleInstances.Renderer.render(this.config.data.blocks);
      }
      /**
       * Make modules instances and save it to the @property this.moduleInstances
       */
      constructModules() {
        Object.entries(mi).forEach(([e, t]) => {
          try {
            this.moduleInstances[e] = new t({
              config: this.configuration,
              eventsDispatcher: this.eventsDispatcher
            });
          } catch (o) {
            L("[constructModules]", `Module ${e} skipped because`, "error", o);
          }
        });
      }
      /**
       * Modules instances configuration:
       *  - pass other modules to the 'state' property
       *  - ...
       */
      configureModules() {
        for (const e in this.moduleInstances)
          Object.prototype.hasOwnProperty.call(this.moduleInstances, e) && (this.moduleInstances[e].state = this.getModulesDiff(e));
      }
      /**
       * Return modules without passed name
       *
       * @param {string} name - module for witch modules difference should be calculated
       */
      getModulesDiff(e) {
        const t = {};
        for (const o in this.moduleInstances)
          o !== e && (t[o] = this.moduleInstances[o]);
        return t;
      }
    }
    /**
     * Editor.js
     *
     * @license Apache-2.0
     * @see Editor.js <https://editorjs.io>
     * @author CodeX Team <https://codex.so>
     */
    class vi {
      /** Editor version */
      static get version() {
        return "2.28.2";
      }
      /**
       * @param {EditorConfig|string|undefined} [configuration] - user configuration
       */
      constructor(e) {
        let t = () => {
        };
        z(e) && D(e.onReady) && (t = e.onReady);
        const o = new ki(e);
        this.isReady = o.isReady.then(() => {
          this.exportAPI(o), t();
        });
      }
      /**
       * Export external API methods
       *
       * @param {Core} editor — Editor's instance
       */
      exportAPI(e) {
        const t = ["configuration"], o = () => {
          Object.values(e.moduleInstances).forEach((n) => {
            D(n.destroy) && n.destroy(), n.listeners.removeAll();
          }), e = null;
          for (const n in this)
            Object.prototype.hasOwnProperty.call(this, n) && delete this[n];
          Object.setPrototypeOf(this, null);
        };
        t.forEach((n) => {
          this[n] = e[n];
        }), this.destroy = o, Object.setPrototypeOf(this, e.moduleInstances.API.methods), delete this.exportAPI, Object.entries({
          blocks: {
            clear: "clear",
            render: "render"
          },
          caret: {
            focus: "focus"
          },
          events: {
            on: "on",
            off: "off",
            emit: "emit"
          },
          saver: {
            save: "save"
          }
        }).forEach(([n, r]) => {
          Object.entries(r).forEach(([a, l]) => {
            this[l] = e.moduleInstances.API.methods[n][a];
          });
        });
      }
    }

    /* node_modules\sveditorjs\src\editor.svelte generated by Svelte v3.59.2 */
    const file = "node_modules\\sveditorjs\\src\\editor.svelte";
    const get_tools_slot_changes = dirty => ({});
    const get_tools_slot_context = ctx => ({});

    function create_fragment$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let current;
    	const tools_slot_template = /*#slots*/ ctx[1].tools;
    	const tools_slot = create_slot(tools_slot_template, ctx, /*$$scope*/ ctx[0], get_tools_slot_context);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if (tools_slot) tools_slot.c();
    			attr_dev(div0, "class", "e-tools svelte-1eshva4");
    			add_location(div0, file, 118, 7, 3252);
    			attr_dev(div1, "id", "editorjs");
    			attr_dev(div1, "class", "svelte-1eshva4");
    			add_location(div1, file, 117, 4, 3223);
    			attr_dev(div2, "class", "e-row svelte-1eshva4");
    			add_location(div2, file, 115, 4, 3190);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);

    			if (tools_slot) {
    				tools_slot.m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (tools_slot) {
    				if (tools_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						tools_slot,
    						tools_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(tools_slot_template, /*$$scope*/ ctx[0], dirty, get_tools_slot_changes),
    						get_tools_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tools_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tools_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (tools_slot) tools_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let data;
    let url;

    const editor = new vi({
    		/** 
     * Id of Element that should contain the Editor 
     */
    		holder: 'editorjs',
    		data,
    		placeholder: 'Let`s write an awesome story!',
    		/** 
     * Available Tools list. 
     * Pass Tool's class or Settings object for each Tool you want to use 
     */
    		tools: {
    			tooltip: {
    				class: Tooltip,
    				config: {
    					location: 'left',
    					highlightColor: '#FFEFD5',
    					underline: true,
    					backgroundColor: '#154360',
    					textColor: '#FDFEFE'
    				}, //holder: 'editorId',
    				
    			},
    			header: { class: Header, inlineToolbar: ['link'] },
    			list: { class: List, inlineToolbar: true },
    			code: editorjsCodeflask,
    			quote: {
    				class: Quote,
    				inlineToolbar: true,
    				shortcut: 'CMD+SHIFT+O',
    				config: {
    					quotePlaceholder: 'Enter a quote',
    					captionPlaceholder: 'Quote\'s author'
    				}
    			},
    			embed: {
    				class: Embed,
    				inlineToolbar: true,
    				config: { services: { youtube: true, coub: true } }
    			},
    			image: {
    				class: ImageTool,
    				config: {
    					endpoints: {
    						byFile: url, // Your backend file uploader endpoint
    						byUrl: url, // Your endpoint that provides uploading by Url
    						
    					}
    				}
    			},
    			linkTool: {
    				class: LinkTool,
    				config: {
    					endpoint: 'http://localhost:8008/fetchUrl', // Your backend endpoint for url data fetching,
    					
    				}
    			},
    			raw: RawTool,
    			style: EditorJSStyle.StyleInlineTool,
    			table: { class: Table },
    			Marker: { class: Marker, shortcut: 'CMD+SHIFT+M' },
    			underline: Underline,
    			inlineCode: {
    				class: InlineCode,
    				shortcut: 'CMD+SHIFT+M'
    			}
    		}
    	});

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Editor', slots, ['tools']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		EditorJS: vi,
    		Header,
    		List,
    		Quote,
    		editorjsCodeflask,
    		Embed,
    		ImageTool,
    		LinkTool,
    		RawTool,
    		SimpleImage,
    		EditorJSStyle,
    		Table,
    		Marker,
    		Underline,
    		Tooltip,
    		InlineCode,
    		data,
    		url,
    		editor
    	});

    	return [$$scope, slots];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let editor_1;
    	let current;
    	editor_1 = new Editor({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(editor_1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(editor_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editor_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editor_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editor_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Editor, editor });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.querySelector('.sveditor-cont')
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
