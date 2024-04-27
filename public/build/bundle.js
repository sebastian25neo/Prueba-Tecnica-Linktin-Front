
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop$1() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop$1;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop$1;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
            this.$destroy = noop$1;
        }
        $on(type, callback) {
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

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop$1) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop$1) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop$1;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop$1;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop$1;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    function hostMatches(anchor) {
      const host = location.host;
      return (
        anchor.host == host ||
        // svelte seems to kill anchor.host value in ie11, so fall back to checking href
        anchor.href.indexOf(`https://${host}`) === 0 ||
        anchor.href.indexOf(`http://${host}`) === 0
      )
    }

    /* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.35.0 */

    function create_fragment$k(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	component_subscribe($$self, routes, value => $$invalidate(7, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	component_subscribe($$self, location, value => $$invalidate(6, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	component_subscribe($$self, base, value => $$invalidate(5, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	$$self.$$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 32) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			{
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 192) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		$base,
    		$location,
    		$routes,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$h, create_fragment$k, safe_not_equal, { basepath: 3, url: 4 });
    	}
    }

    /* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.35.0 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 4,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[2],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (43:2) {:else}
    function create_else_block$1(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, routeParams, $location*/ 532) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[2],
    		/*routeProps*/ ctx[3]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 28)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    function create_fragment$j(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block$1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	const location = getContext(LOCATION);
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 2) {
    			if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(2, routeParams = $activeRoute.params);
    			}
    		}

    		{
    			const { path, component, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$g, create_fragment$j, safe_not_equal, { path: 8, component: 0 });
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          hostMatches(anchor) &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname + anchor.search, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    var top = 'top';
    var bottom = 'bottom';
    var right = 'right';
    var left = 'left';
    var auto = 'auto';
    var basePlacements = [top, bottom, right, left];
    var start = 'start';
    var end = 'end';
    var clippingParents = 'clippingParents';
    var viewport = 'viewport';
    var popper = 'popper';
    var reference = 'reference';
    var variationPlacements = /*#__PURE__*/basePlacements.reduce(function (acc, placement) {
      return acc.concat([placement + "-" + start, placement + "-" + end]);
    }, []);
    var placements = /*#__PURE__*/[].concat(basePlacements, [auto]).reduce(function (acc, placement) {
      return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
    }, []); // modifiers that need to read the DOM

    var beforeRead = 'beforeRead';
    var read = 'read';
    var afterRead = 'afterRead'; // pure-logic modifiers

    var beforeMain = 'beforeMain';
    var main = 'main';
    var afterMain = 'afterMain'; // modifier with the purpose to write to the DOM (or write into a framework state)

    var beforeWrite = 'beforeWrite';
    var write = 'write';
    var afterWrite = 'afterWrite';
    var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

    function getNodeName(element) {
      return element ? (element.nodeName || '').toLowerCase() : null;
    }

    function getWindow(node) {
      if (node == null) {
        return window;
      }

      if (node.toString() !== '[object Window]') {
        var ownerDocument = node.ownerDocument;
        return ownerDocument ? ownerDocument.defaultView || window : window;
      }

      return node;
    }

    function isElement(node) {
      var OwnElement = getWindow(node).Element;
      return node instanceof OwnElement || node instanceof Element;
    }

    function isHTMLElement(node) {
      var OwnElement = getWindow(node).HTMLElement;
      return node instanceof OwnElement || node instanceof HTMLElement;
    }

    function isShadowRoot(node) {
      // IE 11 has no ShadowRoot
      if (typeof ShadowRoot === 'undefined') {
        return false;
      }

      var OwnElement = getWindow(node).ShadowRoot;
      return node instanceof OwnElement || node instanceof ShadowRoot;
    }

    // and applies them to the HTMLElements such as popper and arrow

    function applyStyles(_ref) {
      var state = _ref.state;
      Object.keys(state.elements).forEach(function (name) {
        var style = state.styles[name] || {};
        var attributes = state.attributes[name] || {};
        var element = state.elements[name]; // arrow is optional + virtual elements

        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        } // Flow doesn't support to extend this property, but it's the most
        // effective way to apply styles to an HTMLElement
        // $FlowFixMe[cannot-write]


        Object.assign(element.style, style);
        Object.keys(attributes).forEach(function (name) {
          var value = attributes[name];

          if (value === false) {
            element.removeAttribute(name);
          } else {
            element.setAttribute(name, value === true ? '' : value);
          }
        });
      });
    }

    function effect$2(_ref2) {
      var state = _ref2.state;
      var initialStyles = {
        popper: {
          position: state.options.strategy,
          left: '0',
          top: '0',
          margin: '0'
        },
        arrow: {
          position: 'absolute'
        },
        reference: {}
      };
      Object.assign(state.elements.popper.style, initialStyles.popper);
      state.styles = initialStyles;

      if (state.elements.arrow) {
        Object.assign(state.elements.arrow.style, initialStyles.arrow);
      }

      return function () {
        Object.keys(state.elements).forEach(function (name) {
          var element = state.elements[name];
          var attributes = state.attributes[name] || {};
          var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]); // Set all values to an empty string to unset them

          var style = styleProperties.reduce(function (style, property) {
            style[property] = '';
            return style;
          }, {}); // arrow is optional + virtual elements

          if (!isHTMLElement(element) || !getNodeName(element)) {
            return;
          }

          Object.assign(element.style, style);
          Object.keys(attributes).forEach(function (attribute) {
            element.removeAttribute(attribute);
          });
        });
      };
    } // eslint-disable-next-line import/no-unused-modules


    var applyStyles$1 = {
      name: 'applyStyles',
      enabled: true,
      phase: 'write',
      fn: applyStyles,
      effect: effect$2,
      requires: ['computeStyles']
    };

    function getBasePlacement(placement) {
      return placement.split('-')[0];
    }

    function getBoundingClientRect(element) {
      var rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        x: rect.left,
        y: rect.top
      };
    }

    // means it doesn't take into account transforms.

    function getLayoutRect(element) {
      var clientRect = getBoundingClientRect(element); // Use the clientRect sizes if it's not been transformed.
      // Fixes https://github.com/popperjs/popper-core/issues/1223

      var width = element.offsetWidth;
      var height = element.offsetHeight;

      if (Math.abs(clientRect.width - width) <= 1) {
        width = clientRect.width;
      }

      if (Math.abs(clientRect.height - height) <= 1) {
        height = clientRect.height;
      }

      return {
        x: element.offsetLeft,
        y: element.offsetTop,
        width: width,
        height: height
      };
    }

    function contains(parent, child) {
      var rootNode = child.getRootNode && child.getRootNode(); // First, attempt with faster native method

      if (parent.contains(child)) {
        return true;
      } // then fallback to custom implementation with Shadow DOM support
      else if (rootNode && isShadowRoot(rootNode)) {
          var next = child;

          do {
            if (next && parent.isSameNode(next)) {
              return true;
            } // $FlowFixMe[prop-missing]: need a better way to handle this...


            next = next.parentNode || next.host;
          } while (next);
        } // Give up, the result is false


      return false;
    }

    function getComputedStyle(element) {
      return getWindow(element).getComputedStyle(element);
    }

    function isTableElement(element) {
      return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
    }

    function getDocumentElement(element) {
      // $FlowFixMe[incompatible-return]: assume body is always available
      return ((isElement(element) ? element.ownerDocument : // $FlowFixMe[prop-missing]
      element.document) || window.document).documentElement;
    }

    function getParentNode(element) {
      if (getNodeName(element) === 'html') {
        return element;
      }

      return (// this is a quicker (but less type safe) way to save quite some bytes from the bundle
        // $FlowFixMe[incompatible-return]
        // $FlowFixMe[prop-missing]
        element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
        element.parentNode || ( // DOM Element detected
        isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
        // $FlowFixMe[incompatible-call]: HTMLElement is a Node
        getDocumentElement(element) // fallback

      );
    }

    function getTrueOffsetParent(element) {
      if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
      getComputedStyle(element).position === 'fixed') {
        return null;
      }

      return element.offsetParent;
    } // `.offsetParent` reports `null` for fixed elements, while absolute elements
    // return the containing block


    function getContainingBlock(element) {
      var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
      var currentNode = getParentNode(element);

      while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
        var css = getComputedStyle(currentNode); // This is non-exhaustive but covers the most common CSS properties that
        // create a containing block.
        // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block

        if (css.transform !== 'none' || css.perspective !== 'none' || css.contain === 'paint' || ['transform', 'perspective'].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === 'filter' || isFirefox && css.filter && css.filter !== 'none') {
          return currentNode;
        } else {
          currentNode = currentNode.parentNode;
        }
      }

      return null;
    } // Gets the closest ancestor positioned element. Handles some edge cases,
    // such as table ancestors and cross browser bugs.


    function getOffsetParent(element) {
      var window = getWindow(element);
      var offsetParent = getTrueOffsetParent(element);

      while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === 'static') {
        offsetParent = getTrueOffsetParent(offsetParent);
      }

      if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static')) {
        return window;
      }

      return offsetParent || getContainingBlock(element) || window;
    }

    function getMainAxisFromPlacement(placement) {
      return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y';
    }

    var max = Math.max;
    var min = Math.min;
    var round = Math.round;

    function within(min$1, value, max$1) {
      return max(min$1, min(value, max$1));
    }

    function getFreshSideObject() {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
    }

    function mergePaddingObject(paddingObject) {
      return Object.assign({}, getFreshSideObject(), paddingObject);
    }

    function expandToHashMap(value, keys) {
      return keys.reduce(function (hashMap, key) {
        hashMap[key] = value;
        return hashMap;
      }, {});
    }

    var toPaddingObject = function toPaddingObject(padding, state) {
      padding = typeof padding === 'function' ? padding(Object.assign({}, state.rects, {
        placement: state.placement
      })) : padding;
      return mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
    };

    function arrow(_ref) {
      var _state$modifiersData$;

      var state = _ref.state,
          name = _ref.name,
          options = _ref.options;
      var arrowElement = state.elements.arrow;
      var popperOffsets = state.modifiersData.popperOffsets;
      var basePlacement = getBasePlacement(state.placement);
      var axis = getMainAxisFromPlacement(basePlacement);
      var isVertical = [left, right].indexOf(basePlacement) >= 0;
      var len = isVertical ? 'height' : 'width';

      if (!arrowElement || !popperOffsets) {
        return;
      }

      var paddingObject = toPaddingObject(options.padding, state);
      var arrowRect = getLayoutRect(arrowElement);
      var minProp = axis === 'y' ? top : left;
      var maxProp = axis === 'y' ? bottom : right;
      var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
      var startDiff = popperOffsets[axis] - state.rects.reference[axis];
      var arrowOffsetParent = getOffsetParent(arrowElement);
      var clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
      var centerToReference = endDiff / 2 - startDiff / 2; // Make sure the arrow doesn't overflow the popper if the center point is
      // outside of the popper bounds

      var min = paddingObject[minProp];
      var max = clientSize - arrowRect[len] - paddingObject[maxProp];
      var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
      var offset = within(min, center, max); // Prevents breaking syntax highlighting...

      var axisProp = axis;
      state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
    }

    function effect$1(_ref2) {
      var state = _ref2.state,
          options = _ref2.options;
      var _options$element = options.element,
          arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element;

      if (arrowElement == null) {
        return;
      } // CSS selector


      if (typeof arrowElement === 'string') {
        arrowElement = state.elements.popper.querySelector(arrowElement);

        if (!arrowElement) {
          return;
        }
      }

      if (process.env.NODE_ENV !== "production") {
        if (!isHTMLElement(arrowElement)) {
          console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', 'To use an SVG arrow, wrap it in an HTMLElement that will be used as', 'the arrow.'].join(' '));
        }
      }

      if (!contains(state.elements.popper, arrowElement)) {
        if (process.env.NODE_ENV !== "production") {
          console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', 'element.'].join(' '));
        }

        return;
      }

      state.elements.arrow = arrowElement;
    } // eslint-disable-next-line import/no-unused-modules


    var arrow$1 = {
      name: 'arrow',
      enabled: true,
      phase: 'main',
      fn: arrow,
      effect: effect$1,
      requires: ['popperOffsets'],
      requiresIfExists: ['preventOverflow']
    };

    var unsetSides = {
      top: 'auto',
      right: 'auto',
      bottom: 'auto',
      left: 'auto'
    }; // Round the offsets to the nearest suitable subpixel based on the DPR.
    // Zooming can change the DPR, but it seems to report a value that will
    // cleanly divide the values into the appropriate subpixels.

    function roundOffsetsByDPR(_ref) {
      var x = _ref.x,
          y = _ref.y;
      var win = window;
      var dpr = win.devicePixelRatio || 1;
      return {
        x: round(round(x * dpr) / dpr) || 0,
        y: round(round(y * dpr) / dpr) || 0
      };
    }

    function mapToStyles(_ref2) {
      var _Object$assign2;

      var popper = _ref2.popper,
          popperRect = _ref2.popperRect,
          placement = _ref2.placement,
          offsets = _ref2.offsets,
          position = _ref2.position,
          gpuAcceleration = _ref2.gpuAcceleration,
          adaptive = _ref2.adaptive,
          roundOffsets = _ref2.roundOffsets;

      var _ref3 = roundOffsets === true ? roundOffsetsByDPR(offsets) : typeof roundOffsets === 'function' ? roundOffsets(offsets) : offsets,
          _ref3$x = _ref3.x,
          x = _ref3$x === void 0 ? 0 : _ref3$x,
          _ref3$y = _ref3.y,
          y = _ref3$y === void 0 ? 0 : _ref3$y;

      var hasX = offsets.hasOwnProperty('x');
      var hasY = offsets.hasOwnProperty('y');
      var sideX = left;
      var sideY = top;
      var win = window;

      if (adaptive) {
        var offsetParent = getOffsetParent(popper);
        var heightProp = 'clientHeight';
        var widthProp = 'clientWidth';

        if (offsetParent === getWindow(popper)) {
          offsetParent = getDocumentElement(popper);

          if (getComputedStyle(offsetParent).position !== 'static') {
            heightProp = 'scrollHeight';
            widthProp = 'scrollWidth';
          }
        } // $FlowFixMe[incompatible-cast]: force type refinement, we compare offsetParent with window above, but Flow doesn't detect it


        offsetParent = offsetParent;

        if (placement === top) {
          sideY = bottom; // $FlowFixMe[prop-missing]

          y -= offsetParent[heightProp] - popperRect.height;
          y *= gpuAcceleration ? 1 : -1;
        }

        if (placement === left) {
          sideX = right; // $FlowFixMe[prop-missing]

          x -= offsetParent[widthProp] - popperRect.width;
          x *= gpuAcceleration ? 1 : -1;
        }
      }

      var commonStyles = Object.assign({
        position: position
      }, adaptive && unsetSides);

      if (gpuAcceleration) {
        var _Object$assign;

        return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '', _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) < 2 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
      }

      return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : '', _Object$assign2[sideX] = hasX ? x + "px" : '', _Object$assign2.transform = '', _Object$assign2));
    }

    function computeStyles(_ref4) {
      var state = _ref4.state,
          options = _ref4.options;
      var _options$gpuAccelerat = options.gpuAcceleration,
          gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat,
          _options$adaptive = options.adaptive,
          adaptive = _options$adaptive === void 0 ? true : _options$adaptive,
          _options$roundOffsets = options.roundOffsets,
          roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;

      if (process.env.NODE_ENV !== "production") {
        var transitionProperty = getComputedStyle(state.elements.popper).transitionProperty || '';

        if (adaptive && ['transform', 'top', 'right', 'bottom', 'left'].some(function (property) {
          return transitionProperty.indexOf(property) >= 0;
        })) {
          console.warn(['Popper: Detected CSS transitions on at least one of the following', 'CSS properties: "transform", "top", "right", "bottom", "left".', '\n\n', 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', 'for smooth transitions, or remove these properties from the CSS', 'transition declaration on the popper element if only transitioning', 'opacity or background-color for example.', '\n\n', 'We recommend using the popper element as a wrapper around an inner', 'element that can have any CSS property transitioned for animations.'].join(' '));
        }
      }

      var commonStyles = {
        placement: getBasePlacement(state.placement),
        popper: state.elements.popper,
        popperRect: state.rects.popper,
        gpuAcceleration: gpuAcceleration
      };

      if (state.modifiersData.popperOffsets != null) {
        state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.popperOffsets,
          position: state.options.strategy,
          adaptive: adaptive,
          roundOffsets: roundOffsets
        })));
      }

      if (state.modifiersData.arrow != null) {
        state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.arrow,
          position: 'absolute',
          adaptive: false,
          roundOffsets: roundOffsets
        })));
      }

      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-placement': state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var computeStyles$1 = {
      name: 'computeStyles',
      enabled: true,
      phase: 'beforeWrite',
      fn: computeStyles,
      data: {}
    };

    var passive = {
      passive: true
    };

    function effect(_ref) {
      var state = _ref.state,
          instance = _ref.instance,
          options = _ref.options;
      var _options$scroll = options.scroll,
          scroll = _options$scroll === void 0 ? true : _options$scroll,
          _options$resize = options.resize,
          resize = _options$resize === void 0 ? true : _options$resize;
      var window = getWindow(state.elements.popper);
      var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);

      if (scroll) {
        scrollParents.forEach(function (scrollParent) {
          scrollParent.addEventListener('scroll', instance.update, passive);
        });
      }

      if (resize) {
        window.addEventListener('resize', instance.update, passive);
      }

      return function () {
        if (scroll) {
          scrollParents.forEach(function (scrollParent) {
            scrollParent.removeEventListener('scroll', instance.update, passive);
          });
        }

        if (resize) {
          window.removeEventListener('resize', instance.update, passive);
        }
      };
    } // eslint-disable-next-line import/no-unused-modules


    var eventListeners = {
      name: 'eventListeners',
      enabled: true,
      phase: 'write',
      fn: function fn() {},
      effect: effect,
      data: {}
    };

    var hash$1 = {
      left: 'right',
      right: 'left',
      bottom: 'top',
      top: 'bottom'
    };
    function getOppositePlacement(placement) {
      return placement.replace(/left|right|bottom|top/g, function (matched) {
        return hash$1[matched];
      });
    }

    var hash = {
      start: 'end',
      end: 'start'
    };
    function getOppositeVariationPlacement(placement) {
      return placement.replace(/start|end/g, function (matched) {
        return hash[matched];
      });
    }

    function getWindowScroll(node) {
      var win = getWindow(node);
      var scrollLeft = win.pageXOffset;
      var scrollTop = win.pageYOffset;
      return {
        scrollLeft: scrollLeft,
        scrollTop: scrollTop
      };
    }

    function getWindowScrollBarX(element) {
      // If <html> has a CSS width greater than the viewport, then this will be
      // incorrect for RTL.
      // Popper 1 is broken in this case and never had a bug report so let's assume
      // it's not an issue. I don't think anyone ever specifies width on <html>
      // anyway.
      // Browsers where the left scrollbar doesn't cause an issue report `0` for
      // this (e.g. Edge 2019, IE11, Safari)
      return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
    }

    function getViewportRect(element) {
      var win = getWindow(element);
      var html = getDocumentElement(element);
      var visualViewport = win.visualViewport;
      var width = html.clientWidth;
      var height = html.clientHeight;
      var x = 0;
      var y = 0; // NB: This isn't supported on iOS <= 12. If the keyboard is open, the popper
      // can be obscured underneath it.
      // Also, `html.clientHeight` adds the bottom bar height in Safari iOS, even
      // if it isn't open, so if this isn't available, the popper will be detected
      // to overflow the bottom of the screen too early.

      if (visualViewport) {
        width = visualViewport.width;
        height = visualViewport.height; // Uses Layout Viewport (like Chrome; Safari does not currently)
        // In Chrome, it returns a value very close to 0 (+/-) but contains rounding
        // errors due to floating point numbers, so we need to check precision.
        // Safari returns a number <= 0, usually < -1 when pinch-zoomed
        // Feature detection fails in mobile emulation mode in Chrome.
        // Math.abs(win.innerWidth / visualViewport.scale - visualViewport.width) <
        // 0.001
        // Fallback here: "Not Safari" userAgent

        if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          x = visualViewport.offsetLeft;
          y = visualViewport.offsetTop;
        }
      }

      return {
        width: width,
        height: height,
        x: x + getWindowScrollBarX(element),
        y: y
      };
    }

    // of the `<html>` and `<body>` rect bounds if horizontally scrollable

    function getDocumentRect(element) {
      var _element$ownerDocumen;

      var html = getDocumentElement(element);
      var winScroll = getWindowScroll(element);
      var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
      var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
      var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
      var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
      var y = -winScroll.scrollTop;

      if (getComputedStyle(body || html).direction === 'rtl') {
        x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
      }

      return {
        width: width,
        height: height,
        x: x,
        y: y
      };
    }

    function isScrollParent(element) {
      // Firefox wants us to check `-x` and `-y` variations as well
      var _getComputedStyle = getComputedStyle(element),
          overflow = _getComputedStyle.overflow,
          overflowX = _getComputedStyle.overflowX,
          overflowY = _getComputedStyle.overflowY;

      return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
    }

    function getScrollParent(node) {
      if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
        // $FlowFixMe[incompatible-return]: assume body is always available
        return node.ownerDocument.body;
      }

      if (isHTMLElement(node) && isScrollParent(node)) {
        return node;
      }

      return getScrollParent(getParentNode(node));
    }

    /*
    given a DOM element, return the list of all scroll parents, up the list of ancesors
    until we get to the top window object. This list is what we attach scroll listeners
    to, because if any of these parent elements scroll, we'll need to re-calculate the
    reference element's position.
    */

    function listScrollParents(element, list) {
      var _element$ownerDocumen;

      if (list === void 0) {
        list = [];
      }

      var scrollParent = getScrollParent(element);
      var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
      var win = getWindow(scrollParent);
      var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
      var updatedList = list.concat(target);
      return isBody ? updatedList : // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
      updatedList.concat(listScrollParents(getParentNode(target)));
    }

    function rectToClientRect(rect) {
      return Object.assign({}, rect, {
        left: rect.x,
        top: rect.y,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height
      });
    }

    function getInnerBoundingClientRect(element) {
      var rect = getBoundingClientRect(element);
      rect.top = rect.top + element.clientTop;
      rect.left = rect.left + element.clientLeft;
      rect.bottom = rect.top + element.clientHeight;
      rect.right = rect.left + element.clientWidth;
      rect.width = element.clientWidth;
      rect.height = element.clientHeight;
      rect.x = rect.left;
      rect.y = rect.top;
      return rect;
    }

    function getClientRectFromMixedType(element, clippingParent) {
      return clippingParent === viewport ? rectToClientRect(getViewportRect(element)) : isHTMLElement(clippingParent) ? getInnerBoundingClientRect(clippingParent) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
    } // A "clipping parent" is an overflowable container with the characteristic of
    // clipping (or hiding) overflowing elements with a position different from
    // `initial`


    function getClippingParents(element) {
      var clippingParents = listScrollParents(getParentNode(element));
      var canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle(element).position) >= 0;
      var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

      if (!isElement(clipperElement)) {
        return [];
      } // $FlowFixMe[incompatible-return]: https://github.com/facebook/flow/issues/1414


      return clippingParents.filter(function (clippingParent) {
        return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body';
      });
    } // Gets the maximum area that the element is visible in due to any number of
    // clipping parents


    function getClippingRect(element, boundary, rootBoundary) {
      var mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary);
      var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
      var firstClippingParent = clippingParents[0];
      var clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
        var rect = getClientRectFromMixedType(element, clippingParent);
        accRect.top = max(rect.top, accRect.top);
        accRect.right = min(rect.right, accRect.right);
        accRect.bottom = min(rect.bottom, accRect.bottom);
        accRect.left = max(rect.left, accRect.left);
        return accRect;
      }, getClientRectFromMixedType(element, firstClippingParent));
      clippingRect.width = clippingRect.right - clippingRect.left;
      clippingRect.height = clippingRect.bottom - clippingRect.top;
      clippingRect.x = clippingRect.left;
      clippingRect.y = clippingRect.top;
      return clippingRect;
    }

    function getVariation(placement) {
      return placement.split('-')[1];
    }

    function computeOffsets(_ref) {
      var reference = _ref.reference,
          element = _ref.element,
          placement = _ref.placement;
      var basePlacement = placement ? getBasePlacement(placement) : null;
      var variation = placement ? getVariation(placement) : null;
      var commonX = reference.x + reference.width / 2 - element.width / 2;
      var commonY = reference.y + reference.height / 2 - element.height / 2;
      var offsets;

      switch (basePlacement) {
        case top:
          offsets = {
            x: commonX,
            y: reference.y - element.height
          };
          break;

        case bottom:
          offsets = {
            x: commonX,
            y: reference.y + reference.height
          };
          break;

        case right:
          offsets = {
            x: reference.x + reference.width,
            y: commonY
          };
          break;

        case left:
          offsets = {
            x: reference.x - element.width,
            y: commonY
          };
          break;

        default:
          offsets = {
            x: reference.x,
            y: reference.y
          };
      }

      var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

      if (mainAxis != null) {
        var len = mainAxis === 'y' ? 'height' : 'width';

        switch (variation) {
          case start:
            offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
            break;

          case end:
            offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
            break;
        }
      }

      return offsets;
    }

    function detectOverflow(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          _options$placement = _options.placement,
          placement = _options$placement === void 0 ? state.placement : _options$placement,
          _options$boundary = _options.boundary,
          boundary = _options$boundary === void 0 ? clippingParents : _options$boundary,
          _options$rootBoundary = _options.rootBoundary,
          rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary,
          _options$elementConte = _options.elementContext,
          elementContext = _options$elementConte === void 0 ? popper : _options$elementConte,
          _options$altBoundary = _options.altBoundary,
          altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary,
          _options$padding = _options.padding,
          padding = _options$padding === void 0 ? 0 : _options$padding;
      var paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
      var altContext = elementContext === popper ? reference : popper;
      var referenceElement = state.elements.reference;
      var popperRect = state.rects.popper;
      var element = state.elements[altBoundary ? altContext : elementContext];
      var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary);
      var referenceClientRect = getBoundingClientRect(referenceElement);
      var popperOffsets = computeOffsets({
        reference: referenceClientRect,
        element: popperRect,
        strategy: 'absolute',
        placement: placement
      });
      var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets));
      var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect; // positive = overflowing the clipping rect
      // 0 or negative = within the clipping rect

      var overflowOffsets = {
        top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
        bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
        left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
        right: elementClientRect.right - clippingClientRect.right + paddingObject.right
      };
      var offsetData = state.modifiersData.offset; // Offsets can be applied only to the popper element

      if (elementContext === popper && offsetData) {
        var offset = offsetData[placement];
        Object.keys(overflowOffsets).forEach(function (key) {
          var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
          var axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x';
          overflowOffsets[key] += offset[axis] * multiply;
        });
      }

      return overflowOffsets;
    }

    function computeAutoPlacement(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          placement = _options.placement,
          boundary = _options.boundary,
          rootBoundary = _options.rootBoundary,
          padding = _options.padding,
          flipVariations = _options.flipVariations,
          _options$allowedAutoP = _options.allowedAutoPlacements,
          allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
      var variation = getVariation(placement);
      var placements$1 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function (placement) {
        return getVariation(placement) === variation;
      }) : basePlacements;
      var allowedPlacements = placements$1.filter(function (placement) {
        return allowedAutoPlacements.indexOf(placement) >= 0;
      });

      if (allowedPlacements.length === 0) {
        allowedPlacements = placements$1;

        if (process.env.NODE_ENV !== "production") {
          console.error(['Popper: The `allowedAutoPlacements` option did not allow any', 'placements. Ensure the `placement` option matches the variation', 'of the allowed placements.', 'For example, "auto" cannot be used to allow "bottom-start".', 'Use "auto-start" instead.'].join(' '));
        }
      } // $FlowFixMe[incompatible-type]: Flow seems to have problems with two array unions...


      var overflows = allowedPlacements.reduce(function (acc, placement) {
        acc[placement] = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding
        })[getBasePlacement(placement)];
        return acc;
      }, {});
      return Object.keys(overflows).sort(function (a, b) {
        return overflows[a] - overflows[b];
      });
    }

    function getExpandedFallbackPlacements(placement) {
      if (getBasePlacement(placement) === auto) {
        return [];
      }

      var oppositePlacement = getOppositePlacement(placement);
      return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
    }

    function flip(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;

      if (state.modifiersData[name]._skip) {
        return;
      }

      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis,
          specifiedFallbackPlacements = options.fallbackPlacements,
          padding = options.padding,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          _options$flipVariatio = options.flipVariations,
          flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio,
          allowedAutoPlacements = options.allowedAutoPlacements;
      var preferredPlacement = state.options.placement;
      var basePlacement = getBasePlacement(preferredPlacement);
      var isBasePlacement = basePlacement === preferredPlacement;
      var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
      var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
        return acc.concat(getBasePlacement(placement) === auto ? computeAutoPlacement(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding,
          flipVariations: flipVariations,
          allowedAutoPlacements: allowedAutoPlacements
        }) : placement);
      }, []);
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var checksMap = new Map();
      var makeFallbackChecks = true;
      var firstFittingPlacement = placements[0];

      for (var i = 0; i < placements.length; i++) {
        var placement = placements[i];

        var _basePlacement = getBasePlacement(placement);

        var isStartVariation = getVariation(placement) === start;
        var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
        var len = isVertical ? 'width' : 'height';
        var overflow = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          altBoundary: altBoundary,
          padding: padding
        });
        var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;

        if (referenceRect[len] > popperRect[len]) {
          mainVariationSide = getOppositePlacement(mainVariationSide);
        }

        var altVariationSide = getOppositePlacement(mainVariationSide);
        var checks = [];

        if (checkMainAxis) {
          checks.push(overflow[_basePlacement] <= 0);
        }

        if (checkAltAxis) {
          checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
        }

        if (checks.every(function (check) {
          return check;
        })) {
          firstFittingPlacement = placement;
          makeFallbackChecks = false;
          break;
        }

        checksMap.set(placement, checks);
      }

      if (makeFallbackChecks) {
        // `2` may be desired in some cases – research later
        var numberOfChecks = flipVariations ? 3 : 1;

        var _loop = function _loop(_i) {
          var fittingPlacement = placements.find(function (placement) {
            var checks = checksMap.get(placement);

            if (checks) {
              return checks.slice(0, _i).every(function (check) {
                return check;
              });
            }
          });

          if (fittingPlacement) {
            firstFittingPlacement = fittingPlacement;
            return "break";
          }
        };

        for (var _i = numberOfChecks; _i > 0; _i--) {
          var _ret = _loop(_i);

          if (_ret === "break") break;
        }
      }

      if (state.placement !== firstFittingPlacement) {
        state.modifiersData[name]._skip = true;
        state.placement = firstFittingPlacement;
        state.reset = true;
      }
    } // eslint-disable-next-line import/no-unused-modules


    var flip$1 = {
      name: 'flip',
      enabled: true,
      phase: 'main',
      fn: flip,
      requiresIfExists: ['offset'],
      data: {
        _skip: false
      }
    };

    function getSideOffsets(overflow, rect, preventedOffsets) {
      if (preventedOffsets === void 0) {
        preventedOffsets = {
          x: 0,
          y: 0
        };
      }

      return {
        top: overflow.top - rect.height - preventedOffsets.y,
        right: overflow.right - rect.width + preventedOffsets.x,
        bottom: overflow.bottom - rect.height + preventedOffsets.y,
        left: overflow.left - rect.width - preventedOffsets.x
      };
    }

    function isAnySideFullyClipped(overflow) {
      return [top, right, bottom, left].some(function (side) {
        return overflow[side] >= 0;
      });
    }

    function hide(_ref) {
      var state = _ref.state,
          name = _ref.name;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var preventedOffsets = state.modifiersData.preventOverflow;
      var referenceOverflow = detectOverflow(state, {
        elementContext: 'reference'
      });
      var popperAltOverflow = detectOverflow(state, {
        altBoundary: true
      });
      var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
      var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
      var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
      var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
      state.modifiersData[name] = {
        referenceClippingOffsets: referenceClippingOffsets,
        popperEscapeOffsets: popperEscapeOffsets,
        isReferenceHidden: isReferenceHidden,
        hasPopperEscaped: hasPopperEscaped
      };
      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-reference-hidden': isReferenceHidden,
        'data-popper-escaped': hasPopperEscaped
      });
    } // eslint-disable-next-line import/no-unused-modules


    var hide$1 = {
      name: 'hide',
      enabled: true,
      phase: 'main',
      requiresIfExists: ['preventOverflow'],
      fn: hide
    };

    function distanceAndSkiddingToXY(placement, rects, offset) {
      var basePlacement = getBasePlacement(placement);
      var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;

      var _ref = typeof offset === 'function' ? offset(Object.assign({}, rects, {
        placement: placement
      })) : offset,
          skidding = _ref[0],
          distance = _ref[1];

      skidding = skidding || 0;
      distance = (distance || 0) * invertDistance;
      return [left, right].indexOf(basePlacement) >= 0 ? {
        x: distance,
        y: skidding
      } : {
        x: skidding,
        y: distance
      };
    }

    function offset(_ref2) {
      var state = _ref2.state,
          options = _ref2.options,
          name = _ref2.name;
      var _options$offset = options.offset,
          offset = _options$offset === void 0 ? [0, 0] : _options$offset;
      var data = placements.reduce(function (acc, placement) {
        acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
        return acc;
      }, {});
      var _data$state$placement = data[state.placement],
          x = _data$state$placement.x,
          y = _data$state$placement.y;

      if (state.modifiersData.popperOffsets != null) {
        state.modifiersData.popperOffsets.x += x;
        state.modifiersData.popperOffsets.y += y;
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var offset$1 = {
      name: 'offset',
      enabled: true,
      phase: 'main',
      requires: ['popperOffsets'],
      fn: offset
    };

    function popperOffsets(_ref) {
      var state = _ref.state,
          name = _ref.name;
      // Offsets are the actual position the popper needs to have to be
      // properly positioned near its reference element
      // This is the most basic placement, and will be adjusted by
      // the modifiers in the next step
      state.modifiersData[name] = computeOffsets({
        reference: state.rects.reference,
        element: state.rects.popper,
        strategy: 'absolute',
        placement: state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var popperOffsets$1 = {
      name: 'popperOffsets',
      enabled: true,
      phase: 'read',
      fn: popperOffsets,
      data: {}
    };

    function getAltAxis(axis) {
      return axis === 'x' ? 'y' : 'x';
    }

    function preventOverflow(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;
      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          padding = options.padding,
          _options$tether = options.tether,
          tether = _options$tether === void 0 ? true : _options$tether,
          _options$tetherOffset = options.tetherOffset,
          tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
      var overflow = detectOverflow(state, {
        boundary: boundary,
        rootBoundary: rootBoundary,
        padding: padding,
        altBoundary: altBoundary
      });
      var basePlacement = getBasePlacement(state.placement);
      var variation = getVariation(state.placement);
      var isBasePlacement = !variation;
      var mainAxis = getMainAxisFromPlacement(basePlacement);
      var altAxis = getAltAxis(mainAxis);
      var popperOffsets = state.modifiersData.popperOffsets;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var tetherOffsetValue = typeof tetherOffset === 'function' ? tetherOffset(Object.assign({}, state.rects, {
        placement: state.placement
      })) : tetherOffset;
      var data = {
        x: 0,
        y: 0
      };

      if (!popperOffsets) {
        return;
      }

      if (checkMainAxis || checkAltAxis) {
        var mainSide = mainAxis === 'y' ? top : left;
        var altSide = mainAxis === 'y' ? bottom : right;
        var len = mainAxis === 'y' ? 'height' : 'width';
        var offset = popperOffsets[mainAxis];
        var min$1 = popperOffsets[mainAxis] + overflow[mainSide];
        var max$1 = popperOffsets[mainAxis] - overflow[altSide];
        var additive = tether ? -popperRect[len] / 2 : 0;
        var minLen = variation === start ? referenceRect[len] : popperRect[len];
        var maxLen = variation === start ? -popperRect[len] : -referenceRect[len]; // We need to include the arrow in the calculation so the arrow doesn't go
        // outside the reference bounds

        var arrowElement = state.elements.arrow;
        var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
          width: 0,
          height: 0
        };
        var arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject();
        var arrowPaddingMin = arrowPaddingObject[mainSide];
        var arrowPaddingMax = arrowPaddingObject[altSide]; // If the reference length is smaller than the arrow length, we don't want
        // to include its full size in the calculation. If the reference is small
        // and near the edge of a boundary, the popper can overflow even if the
        // reference is not overflowing as well (e.g. virtual elements with no
        // width or height)

        var arrowLen = within(0, referenceRect[len], arrowRect[len]);
        var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - tetherOffsetValue : minLen - arrowLen - arrowPaddingMin - tetherOffsetValue;
        var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + tetherOffsetValue : maxLen + arrowLen + arrowPaddingMax + tetherOffsetValue;
        var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
        var clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
        var offsetModifierValue = state.modifiersData.offset ? state.modifiersData.offset[state.placement][mainAxis] : 0;
        var tetherMin = popperOffsets[mainAxis] + minOffset - offsetModifierValue - clientOffset;
        var tetherMax = popperOffsets[mainAxis] + maxOffset - offsetModifierValue;

        if (checkMainAxis) {
          var preventedOffset = within(tether ? min(min$1, tetherMin) : min$1, offset, tether ? max(max$1, tetherMax) : max$1);
          popperOffsets[mainAxis] = preventedOffset;
          data[mainAxis] = preventedOffset - offset;
        }

        if (checkAltAxis) {
          var _mainSide = mainAxis === 'x' ? top : left;

          var _altSide = mainAxis === 'x' ? bottom : right;

          var _offset = popperOffsets[altAxis];

          var _min = _offset + overflow[_mainSide];

          var _max = _offset - overflow[_altSide];

          var _preventedOffset = within(tether ? min(_min, tetherMin) : _min, _offset, tether ? max(_max, tetherMax) : _max);

          popperOffsets[altAxis] = _preventedOffset;
          data[altAxis] = _preventedOffset - _offset;
        }
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var preventOverflow$1 = {
      name: 'preventOverflow',
      enabled: true,
      phase: 'main',
      fn: preventOverflow,
      requiresIfExists: ['offset']
    };

    function getHTMLElementScroll(element) {
      return {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop
      };
    }

    function getNodeScroll(node) {
      if (node === getWindow(node) || !isHTMLElement(node)) {
        return getWindowScroll(node);
      } else {
        return getHTMLElementScroll(node);
      }
    }

    // Composite means it takes into account transforms as well as layout.

    function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
      if (isFixed === void 0) {
        isFixed = false;
      }

      var documentElement = getDocumentElement(offsetParent);
      var rect = getBoundingClientRect(elementOrVirtualElement);
      var isOffsetParentAnElement = isHTMLElement(offsetParent);
      var scroll = {
        scrollLeft: 0,
        scrollTop: 0
      };
      var offsets = {
        x: 0,
        y: 0
      };

      if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
        if (getNodeName(offsetParent) !== 'body' || // https://github.com/popperjs/popper-core/issues/1078
        isScrollParent(documentElement)) {
          scroll = getNodeScroll(offsetParent);
        }

        if (isHTMLElement(offsetParent)) {
          offsets = getBoundingClientRect(offsetParent);
          offsets.x += offsetParent.clientLeft;
          offsets.y += offsetParent.clientTop;
        } else if (documentElement) {
          offsets.x = getWindowScrollBarX(documentElement);
        }
      }

      return {
        x: rect.left + scroll.scrollLeft - offsets.x,
        y: rect.top + scroll.scrollTop - offsets.y,
        width: rect.width,
        height: rect.height
      };
    }

    function order(modifiers) {
      var map = new Map();
      var visited = new Set();
      var result = [];
      modifiers.forEach(function (modifier) {
        map.set(modifier.name, modifier);
      }); // On visiting object, check for its dependencies and visit them recursively

      function sort(modifier) {
        visited.add(modifier.name);
        var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
        requires.forEach(function (dep) {
          if (!visited.has(dep)) {
            var depModifier = map.get(dep);

            if (depModifier) {
              sort(depModifier);
            }
          }
        });
        result.push(modifier);
      }

      modifiers.forEach(function (modifier) {
        if (!visited.has(modifier.name)) {
          // check for visited object
          sort(modifier);
        }
      });
      return result;
    }

    function orderModifiers(modifiers) {
      // order based on dependencies
      var orderedModifiers = order(modifiers); // order based on phase

      return modifierPhases.reduce(function (acc, phase) {
        return acc.concat(orderedModifiers.filter(function (modifier) {
          return modifier.phase === phase;
        }));
      }, []);
    }

    function debounce(fn) {
      var pending;
      return function () {
        if (!pending) {
          pending = new Promise(function (resolve) {
            Promise.resolve().then(function () {
              pending = undefined;
              resolve(fn());
            });
          });
        }

        return pending;
      };
    }

    function format(str) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return [].concat(args).reduce(function (p, c) {
        return p.replace(/%s/, c);
      }, str);
    }

    var INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s';
    var MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available';
    var VALID_PROPERTIES = ['name', 'enabled', 'phase', 'fn', 'effect', 'requires', 'options'];
    function validateModifiers(modifiers) {
      modifiers.forEach(function (modifier) {
        Object.keys(modifier).forEach(function (key) {
          switch (key) {
            case 'name':
              if (typeof modifier.name !== 'string') {
                console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', "\"" + String(modifier.name) + "\""));
              }

              break;

            case 'enabled':
              if (typeof modifier.enabled !== 'boolean') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', "\"" + String(modifier.enabled) + "\""));
              }

            case 'phase':
              if (modifierPhases.indexOf(modifier.phase) < 0) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', "either " + modifierPhases.join(', '), "\"" + String(modifier.phase) + "\""));
              }

              break;

            case 'fn':
              if (typeof modifier.fn !== 'function') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', "\"" + String(modifier.fn) + "\""));
              }

              break;

            case 'effect':
              if (typeof modifier.effect !== 'function') {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', "\"" + String(modifier.fn) + "\""));
              }

              break;

            case 'requires':
              if (!Array.isArray(modifier.requires)) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', "\"" + String(modifier.requires) + "\""));
              }

              break;

            case 'requiresIfExists':
              if (!Array.isArray(modifier.requiresIfExists)) {
                console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', "\"" + String(modifier.requiresIfExists) + "\""));
              }

              break;

            case 'options':
            case 'data':
              break;

            default:
              console.error("PopperJS: an invalid property has been provided to the \"" + modifier.name + "\" modifier, valid properties are " + VALID_PROPERTIES.map(function (s) {
                return "\"" + s + "\"";
              }).join(', ') + "; but \"" + key + "\" was provided.");
          }

          modifier.requires && modifier.requires.forEach(function (requirement) {
            if (modifiers.find(function (mod) {
              return mod.name === requirement;
            }) == null) {
              console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement));
            }
          });
        });
      });
    }

    function uniqueBy(arr, fn) {
      var identifiers = new Set();
      return arr.filter(function (item) {
        var identifier = fn(item);

        if (!identifiers.has(identifier)) {
          identifiers.add(identifier);
          return true;
        }
      });
    }

    function mergeByName(modifiers) {
      var merged = modifiers.reduce(function (merged, current) {
        var existing = merged[current.name];
        merged[current.name] = existing ? Object.assign({}, existing, current, {
          options: Object.assign({}, existing.options, current.options),
          data: Object.assign({}, existing.data, current.data)
        }) : current;
        return merged;
      }, {}); // IE11 does not support Object.values

      return Object.keys(merged).map(function (key) {
        return merged[key];
      });
    }

    var INVALID_ELEMENT_ERROR = 'Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.';
    var INFINITE_LOOP_ERROR = 'Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.';
    var DEFAULT_OPTIONS = {
      placement: 'bottom',
      modifiers: [],
      strategy: 'absolute'
    };

    function areValidElements() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return !args.some(function (element) {
        return !(element && typeof element.getBoundingClientRect === 'function');
      });
    }

    function popperGenerator(generatorOptions) {
      if (generatorOptions === void 0) {
        generatorOptions = {};
      }

      var _generatorOptions = generatorOptions,
          _generatorOptions$def = _generatorOptions.defaultModifiers,
          defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def,
          _generatorOptions$def2 = _generatorOptions.defaultOptions,
          defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
      return function createPopper(reference, popper, options) {
        if (options === void 0) {
          options = defaultOptions;
        }

        var state = {
          placement: 'bottom',
          orderedModifiers: [],
          options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
          modifiersData: {},
          elements: {
            reference: reference,
            popper: popper
          },
          attributes: {},
          styles: {}
        };
        var effectCleanupFns = [];
        var isDestroyed = false;
        var instance = {
          state: state,
          setOptions: function setOptions(options) {
            cleanupModifierEffects();
            state.options = Object.assign({}, defaultOptions, state.options, options);
            state.scrollParents = {
              reference: isElement(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
              popper: listScrollParents(popper)
            }; // Orders the modifiers based on their dependencies and `phase`
            // properties

            var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers))); // Strip out disabled modifiers

            state.orderedModifiers = orderedModifiers.filter(function (m) {
              return m.enabled;
            }); // Validate the provided modifiers so that the consumer will get warned
            // if one of the modifiers is invalid for any reason

            if (process.env.NODE_ENV !== "production") {
              var modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function (_ref) {
                var name = _ref.name;
                return name;
              });
              validateModifiers(modifiers);

              if (getBasePlacement(state.options.placement) === auto) {
                var flipModifier = state.orderedModifiers.find(function (_ref2) {
                  var name = _ref2.name;
                  return name === 'flip';
                });

                if (!flipModifier) {
                  console.error(['Popper: "auto" placements require the "flip" modifier be', 'present and enabled to work.'].join(' '));
                }
              }

              var _getComputedStyle = getComputedStyle(popper),
                  marginTop = _getComputedStyle.marginTop,
                  marginRight = _getComputedStyle.marginRight,
                  marginBottom = _getComputedStyle.marginBottom,
                  marginLeft = _getComputedStyle.marginLeft; // We no longer take into account `margins` on the popper, and it can
              // cause bugs with positioning, so we'll warn the consumer


              if ([marginTop, marginRight, marginBottom, marginLeft].some(function (margin) {
                return parseFloat(margin);
              })) {
                console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', 'between the popper and its reference element or boundary.', 'To replicate margin, use the `offset` modifier, as well as', 'the `padding` option in the `preventOverflow` and `flip`', 'modifiers.'].join(' '));
              }
            }

            runModifierEffects();
            return instance.update();
          },
          // Sync update – it will always be executed, even if not necessary. This
          // is useful for low frequency updates where sync behavior simplifies the
          // logic.
          // For high frequency updates (e.g. `resize` and `scroll` events), always
          // prefer the async Popper#update method
          forceUpdate: function forceUpdate() {
            if (isDestroyed) {
              return;
            }

            var _state$elements = state.elements,
                reference = _state$elements.reference,
                popper = _state$elements.popper; // Don't proceed if `reference` or `popper` are not valid elements
            // anymore

            if (!areValidElements(reference, popper)) {
              if (process.env.NODE_ENV !== "production") {
                console.error(INVALID_ELEMENT_ERROR);
              }

              return;
            } // Store the reference and popper rects to be read by modifiers


            state.rects = {
              reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
              popper: getLayoutRect(popper)
            }; // Modifiers have the ability to reset the current update cycle. The
            // most common use case for this is the `flip` modifier changing the
            // placement, which then needs to re-run all the modifiers, because the
            // logic was previously ran for the previous placement and is therefore
            // stale/incorrect

            state.reset = false;
            state.placement = state.options.placement; // On each update cycle, the `modifiersData` property for each modifier
            // is filled with the initial data specified by the modifier. This means
            // it doesn't persist and is fresh on each update.
            // To ensure persistent data, use `${name}#persistent`

            state.orderedModifiers.forEach(function (modifier) {
              return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
            });
            var __debug_loops__ = 0;

            for (var index = 0; index < state.orderedModifiers.length; index++) {
              if (process.env.NODE_ENV !== "production") {
                __debug_loops__ += 1;

                if (__debug_loops__ > 100) {
                  console.error(INFINITE_LOOP_ERROR);
                  break;
                }
              }

              if (state.reset === true) {
                state.reset = false;
                index = -1;
                continue;
              }

              var _state$orderedModifie = state.orderedModifiers[index],
                  fn = _state$orderedModifie.fn,
                  _state$orderedModifie2 = _state$orderedModifie.options,
                  _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2,
                  name = _state$orderedModifie.name;

              if (typeof fn === 'function') {
                state = fn({
                  state: state,
                  options: _options,
                  name: name,
                  instance: instance
                }) || state;
              }
            }
          },
          // Async and optimistically optimized update – it will not be executed if
          // not necessary (debounced to run at most once-per-tick)
          update: debounce(function () {
            return new Promise(function (resolve) {
              instance.forceUpdate();
              resolve(state);
            });
          }),
          destroy: function destroy() {
            cleanupModifierEffects();
            isDestroyed = true;
          }
        };

        if (!areValidElements(reference, popper)) {
          if (process.env.NODE_ENV !== "production") {
            console.error(INVALID_ELEMENT_ERROR);
          }

          return instance;
        }

        instance.setOptions(options).then(function (state) {
          if (!isDestroyed && options.onFirstUpdate) {
            options.onFirstUpdate(state);
          }
        }); // Modifiers have the ability to execute arbitrary code before the first
        // update cycle runs. They will be executed in the same order as the update
        // cycle. This is useful when a modifier adds some persistent data that
        // other modifiers need to use, but the modifier is run after the dependent
        // one.

        function runModifierEffects() {
          state.orderedModifiers.forEach(function (_ref3) {
            var name = _ref3.name,
                _ref3$options = _ref3.options,
                options = _ref3$options === void 0 ? {} : _ref3$options,
                effect = _ref3.effect;

            if (typeof effect === 'function') {
              var cleanupFn = effect({
                state: state,
                name: name,
                instance: instance,
                options: options
              });

              var noopFn = function noopFn() {};

              effectCleanupFns.push(cleanupFn || noopFn);
            }
          });
        }

        function cleanupModifierEffects() {
          effectCleanupFns.forEach(function (fn) {
            return fn();
          });
          effectCleanupFns = [];
        }

        return instance;
      };
    }

    var defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1, offset$1, flip$1, preventOverflow$1, arrow$1, hide$1];
    var createPopper = /*#__PURE__*/popperGenerator({
      defaultModifiers: defaultModifiers
    }); // eslint-disable-next-line import/no-unused-modules

    /* src\components\Dropdowns\UserDropdown.svelte generated by Svelte v3.35.0 */

    function create_fragment$i(ctx) {
    	let div2;
    	let a0;
    	let div0;
    	let span;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let a1;
    	let div1_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div2 = element("div");
    			a0 = element("a");
    			div0 = element("div");
    			span = element("span");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			a1 = element("a");
    			a1.textContent = "Cerrar Session";
    			attr(img, "alt", "...");
    			attr(img, "class", "w-full rounded-full align-middle border-none shadow-lg");
    			if (img.src !== (img_src_value = image)) attr(img, "src", img_src_value);
    			attr(span, "class", "w-12 h-12 text-sm text-white bg-blueGray-200 inline-flex items-center justify-center rounded-full");
    			attr(div0, "class", "items-center flex");
    			attr(a0, "class", "text-blueGray-500 block");
    			attr(a0, "href", "#pablo");
    			attr(a1, "href", "/");
    			attr(a1, "class", "text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700");
    			attr(div1, "class", div1_class_value = "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48 " + (/*dropdownPopoverShow*/ ctx[0] ? "block" : "hidden"));
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, a0);
    			append(a0, div0);
    			append(div0, span);
    			append(span, img);
    			/*a0_binding*/ ctx[5](a0);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, a1);
    			/*div1_binding*/ ctx[6](div1);

    			if (!mounted) {
    				dispose = [
    					listen(a0, "click", /*toggleDropdown*/ ctx[3]),
    					listen(a1, "click", /*logout*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*dropdownPopoverShow*/ 1 && div1_class_value !== (div1_class_value = "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48 " + (/*dropdownPopoverShow*/ ctx[0] ? "block" : "hidden"))) {
    				attr(div1, "class", div1_class_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div2);
    			/*a0_binding*/ ctx[5](null);
    			/*div1_binding*/ ctx[6](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const image = "../assets/img/team-1-800x800.jpg";

    function instance$f($$self, $$props, $$invalidate) {
    	let dropdownPopoverShow = false;
    	let btnDropdownRef;
    	let popoverDropdownRef;

    	const toggleDropdown = event => {
    		event.preventDefault();

    		if (dropdownPopoverShow) {
    			$$invalidate(0, dropdownPopoverShow = false);
    		} else {
    			$$invalidate(0, dropdownPopoverShow = true);
    			createPopper(btnDropdownRef, popoverDropdownRef, { placement: "bottom-start" });
    		}
    	};

    	const logout = () => {
    		// Aquí rediriges al usuario a la página de inicio de sesión
    		navigate("/");
    	};

    	function a0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			btnDropdownRef = $$value;
    			$$invalidate(1, btnDropdownRef);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			popoverDropdownRef = $$value;
    			$$invalidate(2, popoverDropdownRef);
    		});
    	}

    	return [
    		dropdownPopoverShow,
    		btnDropdownRef,
    		popoverDropdownRef,
    		toggleDropdown,
    		logout,
    		a0_binding,
    		div1_binding
    	];
    }

    class UserDropdown extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$f, create_fragment$i, safe_not_equal, {});
    	}
    }

    /* src\components\Navbars\AdminNavbar.svelte generated by Svelte v3.35.0 */

    function create_fragment$h(ctx) {
    	let nav;
    	let div1;
    	let div0;
    	let ul;
    	let userdropdown;
    	let current;
    	userdropdown = new UserDropdown({});

    	return {
    		c() {
    			nav = element("nav");
    			div1 = element("div");
    			div0 = element("div");
    			ul = element("ul");
    			create_component(userdropdown.$$.fragment);
    			attr(ul, "class", "flex-col md:flex-row list-none items-center hidden md:flex");
    			attr(div0, "class", "md:flex hidden flex-row flex-wrap items-center lg:ml-auto mr-3");
    			attr(div1, "class", "w-full mx-autp items-center flex justify-between md:flex-nowrap flex-wrap md:px-10 px-4");
    			attr(nav, "class", "absolute top-0 left-0 w-full z-10 bg-transparent md:flex-row md:flex-nowrap md:justify-start flex items-center p-4");
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, div1);
    			append(div1, div0);
    			append(div0, ul);
    			mount_component(userdropdown, ul, null);
    			current = true;
    		},
    		p: noop$1,
    		i(local) {
    			if (current) return;
    			transition_in(userdropdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(userdropdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(nav);
    			destroy_component(userdropdown);
    		}
    	};
    }

    class AdminNavbar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$h, safe_not_equal, {});
    	}
    }

    /* src\components\Dropdowns\NotificationDropdown.svelte generated by Svelte v3.35.0 */

    function create_fragment$g(ctx) {
    	let div2;
    	let a0;
    	let t0;
    	let div1;
    	let a1;
    	let t2;
    	let a2;
    	let t4;
    	let a3;
    	let t6;
    	let div0;
    	let t7;
    	let a4;
    	let div1_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div2 = element("div");
    			a0 = element("a");
    			a0.innerHTML = `<i class="fas fa-bell"></i>`;
    			t0 = space();
    			div1 = element("div");
    			a1 = element("a");
    			a1.textContent = "Action";
    			t2 = space();
    			a2 = element("a");
    			a2.textContent = "Another action";
    			t4 = space();
    			a3 = element("a");
    			a3.textContent = "Something else here";
    			t6 = space();
    			div0 = element("div");
    			t7 = space();
    			a4 = element("a");
    			a4.textContent = "Seprated link";
    			attr(a0, "class", "text-blueGray-500 block py-1 px-3");
    			attr(a0, "href", "#pablo");
    			attr(a1, "href", "#pablo");
    			attr(a1, "class", "text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700");
    			attr(a2, "href", "#pablo");
    			attr(a2, "class", "text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700");
    			attr(a3, "href", "#pablo");
    			attr(a3, "class", "text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700");
    			attr(div0, "class", "h-0 my-2 border border-solid border-blueGray-100");
    			attr(a4, "href", "#pablo");
    			attr(a4, "class", "text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700");
    			attr(div1, "class", div1_class_value = "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48 " + (/*dropdownPopoverShow*/ ctx[0] ? "block" : "hidden"));
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, a0);
    			/*a0_binding*/ ctx[4](a0);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, a1);
    			append(div1, t2);
    			append(div1, a2);
    			append(div1, t4);
    			append(div1, a3);
    			append(div1, t6);
    			append(div1, div0);
    			append(div1, t7);
    			append(div1, a4);
    			/*div1_binding*/ ctx[5](div1);

    			if (!mounted) {
    				dispose = [
    					listen(a0, "click", /*toggleDropdown*/ ctx[3]),
    					listen(a1, "click", click_handler),
    					listen(a2, "click", click_handler_1),
    					listen(a3, "click", click_handler_2),
    					listen(a4, "click", click_handler_3)
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*dropdownPopoverShow*/ 1 && div1_class_value !== (div1_class_value = "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48 " + (/*dropdownPopoverShow*/ ctx[0] ? "block" : "hidden"))) {
    				attr(div1, "class", div1_class_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div2);
    			/*a0_binding*/ ctx[4](null);
    			/*div1_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const click_handler = e => e.preventDefault();
    const click_handler_1 = e => e.preventDefault();
    const click_handler_2 = e => e.preventDefault();
    const click_handler_3 = e => e.preventDefault();

    function instance$e($$self, $$props, $$invalidate) {
    	let dropdownPopoverShow = false;
    	let btnDropdownRef;
    	let popoverDropdownRef;

    	const toggleDropdown = event => {
    		event.preventDefault();

    		if (dropdownPopoverShow) {
    			$$invalidate(0, dropdownPopoverShow = false);
    		} else {
    			$$invalidate(0, dropdownPopoverShow = true);
    			createPopper(btnDropdownRef, popoverDropdownRef, { placement: "bottom-start" });
    		}
    	};

    	function a0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			btnDropdownRef = $$value;
    			$$invalidate(1, btnDropdownRef);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			popoverDropdownRef = $$value;
    			$$invalidate(2, popoverDropdownRef);
    		});
    	}

    	return [
    		dropdownPopoverShow,
    		btnDropdownRef,
    		popoverDropdownRef,
    		toggleDropdown,
    		a0_binding,
    		div1_binding
    	];
    }

    class NotificationDropdown extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$e, create_fragment$g, safe_not_equal, {});
    	}
    }

    /* src\components\Sidebar\Sidebar.svelte generated by Svelte v3.35.0 */

    function create_fragment$f(ctx) {
    	let nav;
    	let div6;
    	let button0;
    	let t0;
    	let a0;
    	let t2;
    	let ul0;
    	let li0;
    	let notificationdropdown;
    	let t3;
    	let li1;
    	let userdropdown;
    	let t4;
    	let div5;
    	let div3;
    	let div2;
    	let div0;
    	let a1;
    	let t6;
    	let div1;
    	let button1;
    	let t7;
    	let form;
    	let t8;
    	let hr;
    	let t9;
    	let h6;
    	let t11;
    	let ul1;
    	let li2;
    	let a2;
    	let i2;
    	let t12;
    	let t13;
    	let li3;
    	let a3;
    	let i3;
    	let t14;
    	let t15;
    	let li4;
    	let a4;
    	let i4;
    	let t16;
    	let div5_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	notificationdropdown = new NotificationDropdown({});
    	userdropdown = new UserDropdown({});

    	return {
    		c() {
    			nav = element("nav");
    			div6 = element("div");
    			button0 = element("button");
    			button0.innerHTML = `<i class="fas fa-bars"></i>`;
    			t0 = space();
    			a0 = element("a");
    			a0.textContent = "Prueba Tecnica Linktin";
    			t2 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			create_component(notificationdropdown.$$.fragment);
    			t3 = space();
    			li1 = element("li");
    			create_component(userdropdown.$$.fragment);
    			t4 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			a1 = element("a");
    			a1.textContent = "Notus Svelte";
    			t6 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.innerHTML = `<i class="fas fa-times"></i>`;
    			t7 = space();
    			form = element("form");
    			form.innerHTML = `<div class="mb-3 pt-0"><input type="text" placeholder="Search" class="border-0 px-3 py-2 h-12 border border-solid border-blueGray-500 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-base leading-snug shadow-none outline-none focus:outline-none w-full font-normal"/></div>`;
    			t8 = space();
    			hr = element("hr");
    			t9 = space();
    			h6 = element("h6");
    			h6.textContent = "Menu";
    			t11 = space();
    			ul1 = element("ul");
    			li2 = element("li");
    			a2 = element("a");
    			i2 = element("i");
    			t12 = text("\r\n            Crear Productos");
    			t13 = space();
    			li3 = element("li");
    			a3 = element("a");
    			i3 = element("i");
    			t14 = text("\r\n            Comprar productos");
    			t15 = space();
    			li4 = element("li");
    			a4 = element("a");
    			i4 = element("i");
    			t16 = text("\r\n            Listado de productos comprados");
    			attr(button0, "class", "cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent");
    			attr(button0, "type", "button");
    			attr(a0, "class", "md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0");
    			attr(a0, "href", "/");
    			attr(li0, "class", "inline-block relative");
    			attr(li1, "class", "inline-block relative");
    			attr(ul0, "class", "md:hidden items-center flex flex-wrap list-none");
    			attr(a1, "class", "md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0");
    			attr(a1, "href", "/");
    			attr(div0, "class", "w-6/12");
    			attr(button1, "type", "button");
    			attr(button1, "class", "cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent");
    			attr(div1, "class", "w-6/12 flex justify-end");
    			attr(div2, "class", "flex flex-wrap");
    			attr(div3, "class", "md:min-w-full md:hidden block pb-4 mb-4 border-b border-solid border-blueGray-200");
    			attr(form, "class", "mt-6 mb-4 md:hidden");
    			attr(hr, "class", "my-4 md:min-w-full");
    			attr(h6, "class", "md:min-w-full text-blueGray-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline");

    			attr(i2, "class", "fas fa-plus-circle mr-2 text-sm " + (location.href.indexOf("/admin/CreateProducts") !== -1
    			? "opacity-75"
    			: "text-blueGray-300"));

    			attr(a2, "href", "/admin/CreateProducts");

    			attr(a2, "class", "text-xs uppercase py-3 font-bold block " + (location.href.indexOf("/admin/CreateProducts") !== -1
    			? "text-red-500 hover:text-red-600"
    			: "text-blueGray-700 hover:text-blueGray-500"));

    			attr(li2, "class", "items-center");

    			attr(i3, "class", "fas fa-shopping-cart mr-2 text-sm " + (location.href.indexOf("/admin/Buyproduct") !== -1
    			? "opacity-75"
    			: "text-blueGray-300"));

    			attr(a3, "href", "/admin/Buyproduct");

    			attr(a3, "class", "text-xs uppercase py-3 font-bold block " + (location.href.indexOf("/admin/Buyproduct") !== -1
    			? "text-red-500 hover:text-red-600"
    			: "text-blueGray-700 hover:text-blueGray-500"));

    			attr(li3, "class", "items-center");

    			attr(i4, "class", "fas fa-list mr-2 text-sm " + (location.href.indexOf("/admin/ListPurchasedProducts") !== -1
    			? "opacity-75"
    			: "text-blueGray-300"));

    			attr(a4, "href", "/admin/ListPurchasedProducts");

    			attr(a4, "class", "text-xs uppercase py-3 font-bold block " + (location.href.indexOf("/admin/ListPurchasedProducts") !== -1
    			? "text-red-500 hover:text-red-600"
    			: "text-blueGray-700 hover:text-blueGray-500"));

    			attr(li4, "class", "items-center");
    			attr(ul1, "class", "md:flex-col md:min-w-full flex flex-col list-none");
    			attr(div5, "class", div5_class_value = "md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded " + /*collapseShow*/ ctx[0]);
    			attr(div6, "class", "md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-wrap items-center justify-between w-full mx-auto");
    			attr(nav, "class", "md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between relative md:w-64 z-10 py-4 px-6");
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, div6);
    			append(div6, button0);
    			append(div6, t0);
    			append(div6, a0);
    			append(div6, t2);
    			append(div6, ul0);
    			append(ul0, li0);
    			mount_component(notificationdropdown, li0, null);
    			append(ul0, t3);
    			append(ul0, li1);
    			mount_component(userdropdown, li1, null);
    			append(div6, t4);
    			append(div6, div5);
    			append(div5, div3);
    			append(div3, div2);
    			append(div2, div0);
    			append(div0, a1);
    			append(div2, t6);
    			append(div2, div1);
    			append(div1, button1);
    			append(div5, t7);
    			append(div5, form);
    			append(div5, t8);
    			append(div5, hr);
    			append(div5, t9);
    			append(div5, h6);
    			append(div5, t11);
    			append(div5, ul1);
    			append(ul1, li2);
    			append(li2, a2);
    			append(a2, i2);
    			append(a2, t12);
    			append(ul1, t13);
    			append(ul1, li3);
    			append(li3, a3);
    			append(a3, i3);
    			append(a3, t14);
    			append(ul1, t15);
    			append(ul1, li4);
    			append(li4, a4);
    			append(a4, i4);
    			append(a4, t16);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[2]),
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1)),
    					listen(button1, "click", /*click_handler_1*/ ctx[3]),
    					action_destroyer(link.call(null, a2)),
    					action_destroyer(link.call(null, a3)),
    					action_destroyer(link.call(null, a4))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*collapseShow*/ 1 && div5_class_value !== (div5_class_value = "md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded " + /*collapseShow*/ ctx[0])) {
    				attr(div5, "class", div5_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(notificationdropdown.$$.fragment, local);
    			transition_in(userdropdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(notificationdropdown.$$.fragment, local);
    			transition_out(userdropdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(nav);
    			destroy_component(notificationdropdown);
    			destroy_component(userdropdown);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let collapseShow = "hidden";

    	function toggleCollapseShow(classes) {
    		$$invalidate(0, collapseShow = classes);
    	}

    	const click_handler = () => toggleCollapseShow("bg-white m-2 py-3 px-6");
    	const click_handler_1 = () => toggleCollapseShow("hidden");
    	return [collapseShow, toggleCollapseShow, click_handler, click_handler_1];
    }

    class Sidebar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$f, safe_not_equal, {});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /*!
    * sweetalert2 v11.10.8
    * Released under the MIT License.
    */

    var sweetalert2_all = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
      module.exports = factory() ;
    })(commonjsGlobal, (function () {
      function _assertClassBrand(e, t, n) {
        if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
        throw new TypeError("Private element is not present on this object");
      }
      function _callSuper(t, o, e) {
        return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
      }
      function _classPrivateFieldGet2(s, a) {
        return s.get(_assertClassBrand(s, a));
      }
      function _classPrivateFieldSet2(s, a, r) {
        return s.set(_assertClassBrand(s, a), r), r;
      }
      function _construct(t, e, r) {
        if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments);
        var o = [null];
        o.push.apply(o, e);
        var p = new (t.bind.apply(t, o))();
        return r && _setPrototypeOf(p, r.prototype), p;
      }
      function _isNativeReflectConstruct() {
        try {
          var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
        } catch (t) {}
        return (_isNativeReflectConstruct = function () {
          return !!t;
        })();
      }
      function _iterableToArrayLimit(r, l) {
        var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
        if (null != t) {
          var e,
            n,
            i,
            u,
            a = [],
            f = !0,
            o = !1;
          try {
            if (i = (t = t.call(r)).next, 0 === l) {
              if (Object(t) !== t) return;
              f = !1;
            } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
          } catch (r) {
            o = !0, n = r;
          } finally {
            try {
              if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
            } finally {
              if (o) throw n;
            }
          }
          return a;
        }
      }
      function _toPrimitive(t, r) {
        if ("object" != typeof t || !t) return t;
        var e = t[Symbol.toPrimitive];
        if (void 0 !== e) {
          var i = e.call(t, r || "default");
          if ("object" != typeof i) return i;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return ("string" === r ? String : Number)(t);
      }
      function _toPropertyKey(t) {
        var i = _toPrimitive(t, "string");
        return "symbol" == typeof i ? i : i + "";
      }
      function _typeof(o) {
        "@babel/helpers - typeof";

        return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
          return typeof o;
        } : function (o) {
          return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
        }, _typeof(o);
      }
      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }
      function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
        }
      }
      function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        Object.defineProperty(Constructor, "prototype", {
          writable: false
        });
        return Constructor;
      }
      function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
          throw new TypeError("Super expression must either be null or a function");
        }
        subClass.prototype = Object.create(superClass && superClass.prototype, {
          constructor: {
            value: subClass,
            writable: true,
            configurable: true
          }
        });
        Object.defineProperty(subClass, "prototype", {
          writable: false
        });
        if (superClass) _setPrototypeOf(subClass, superClass);
      }
      function _getPrototypeOf(o) {
        _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
          return o.__proto__ || Object.getPrototypeOf(o);
        };
        return _getPrototypeOf(o);
      }
      function _setPrototypeOf(o, p) {
        _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
          o.__proto__ = p;
          return o;
        };
        return _setPrototypeOf(o, p);
      }
      function _assertThisInitialized(self) {
        if (self === void 0) {
          throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }
        return self;
      }
      function _possibleConstructorReturn(self, call) {
        if (call && (typeof call === "object" || typeof call === "function")) {
          return call;
        } else if (call !== void 0) {
          throw new TypeError("Derived constructors may only return object or undefined");
        }
        return _assertThisInitialized(self);
      }
      function _superPropBase(object, property) {
        while (!Object.prototype.hasOwnProperty.call(object, property)) {
          object = _getPrototypeOf(object);
          if (object === null) break;
        }
        return object;
      }
      function _get() {
        if (typeof Reflect !== "undefined" && Reflect.get) {
          _get = Reflect.get.bind();
        } else {
          _get = function _get(target, property, receiver) {
            var base = _superPropBase(target, property);
            if (!base) return;
            var desc = Object.getOwnPropertyDescriptor(base, property);
            if (desc.get) {
              return desc.get.call(arguments.length < 3 ? target : receiver);
            }
            return desc.value;
          };
        }
        return _get.apply(this, arguments);
      }
      function _slicedToArray(arr, i) {
        return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
      }
      function _toConsumableArray(arr) {
        return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
      }
      function _arrayWithoutHoles(arr) {
        if (Array.isArray(arr)) return _arrayLikeToArray(arr);
      }
      function _arrayWithHoles(arr) {
        if (Array.isArray(arr)) return arr;
      }
      function _iterableToArray(iter) {
        if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
      }
      function _unsupportedIterableToArray(o, minLen) {
        if (!o) return;
        if (typeof o === "string") return _arrayLikeToArray(o, minLen);
        var n = Object.prototype.toString.call(o).slice(8, -1);
        if (n === "Object" && o.constructor) n = o.constructor.name;
        if (n === "Map" || n === "Set") return Array.from(o);
        if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
      }
      function _arrayLikeToArray(arr, len) {
        if (len == null || len > arr.length) len = arr.length;
        for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
        return arr2;
      }
      function _nonIterableSpread() {
        throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      function _nonIterableRest() {
        throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      function _checkPrivateRedeclaration(obj, privateCollection) {
        if (privateCollection.has(obj)) {
          throw new TypeError("Cannot initialize the same private elements twice on an object");
        }
      }
      function _classPrivateFieldInitSpec(obj, privateMap, value) {
        _checkPrivateRedeclaration(obj, privateMap);
        privateMap.set(obj, value);
      }

      var RESTORE_FOCUS_TIMEOUT = 100;

      /** @type {GlobalState} */
      var globalState = {};
      var focusPreviousActiveElement = function focusPreviousActiveElement() {
        if (globalState.previousActiveElement instanceof HTMLElement) {
          globalState.previousActiveElement.focus();
          globalState.previousActiveElement = null;
        } else if (document.body) {
          document.body.focus();
        }
      };

      /**
       * Restore previous active (focused) element
       *
       * @param {boolean} returnFocus
       * @returns {Promise<void>}
       */
      var restoreActiveElement = function restoreActiveElement(returnFocus) {
        return new Promise(function (resolve) {
          if (!returnFocus) {
            return resolve();
          }
          var x = window.scrollX;
          var y = window.scrollY;
          globalState.restoreFocusTimeout = setTimeout(function () {
            focusPreviousActiveElement();
            resolve();
          }, RESTORE_FOCUS_TIMEOUT); // issues/900

          window.scrollTo(x, y);
        });
      };

      var swalPrefix = 'swal2-';

      /**
       * @typedef
       * { | 'container'
       *   | 'shown'
       *   | 'height-auto'
       *   | 'iosfix'
       *   | 'popup'
       *   | 'modal'
       *   | 'no-backdrop'
       *   | 'no-transition'
       *   | 'toast'
       *   | 'toast-shown'
       *   | 'show'
       *   | 'hide'
       *   | 'close'
       *   | 'title'
       *   | 'html-container'
       *   | 'actions'
       *   | 'confirm'
       *   | 'deny'
       *   | 'cancel'
       *   | 'default-outline'
       *   | 'footer'
       *   | 'icon'
       *   | 'icon-content'
       *   | 'image'
       *   | 'input'
       *   | 'file'
       *   | 'range'
       *   | 'select'
       *   | 'radio'
       *   | 'checkbox'
       *   | 'label'
       *   | 'textarea'
       *   | 'inputerror'
       *   | 'input-label'
       *   | 'validation-message'
       *   | 'progress-steps'
       *   | 'active-progress-step'
       *   | 'progress-step'
       *   | 'progress-step-line'
       *   | 'loader'
       *   | 'loading'
       *   | 'styled'
       *   | 'top'
       *   | 'top-start'
       *   | 'top-end'
       *   | 'top-left'
       *   | 'top-right'
       *   | 'center'
       *   | 'center-start'
       *   | 'center-end'
       *   | 'center-left'
       *   | 'center-right'
       *   | 'bottom'
       *   | 'bottom-start'
       *   | 'bottom-end'
       *   | 'bottom-left'
       *   | 'bottom-right'
       *   | 'grow-row'
       *   | 'grow-column'
       *   | 'grow-fullscreen'
       *   | 'rtl'
       *   | 'timer-progress-bar'
       *   | 'timer-progress-bar-container'
       *   | 'scrollbar-measure'
       *   | 'icon-success'
       *   | 'icon-warning'
       *   | 'icon-info'
       *   | 'icon-question'
       *   | 'icon-error'
       * } SwalClass
       * @typedef {Record<SwalClass, string>} SwalClasses
       */

      /**
       * @typedef {'success' | 'warning' | 'info' | 'question' | 'error'} SwalIcon
       * @typedef {Record<SwalIcon, string>} SwalIcons
       */

      /** @type {SwalClass[]} */
      var classNames = ['container', 'shown', 'height-auto', 'iosfix', 'popup', 'modal', 'no-backdrop', 'no-transition', 'toast', 'toast-shown', 'show', 'hide', 'close', 'title', 'html-container', 'actions', 'confirm', 'deny', 'cancel', 'default-outline', 'footer', 'icon', 'icon-content', 'image', 'input', 'file', 'range', 'select', 'radio', 'checkbox', 'label', 'textarea', 'inputerror', 'input-label', 'validation-message', 'progress-steps', 'active-progress-step', 'progress-step', 'progress-step-line', 'loader', 'loading', 'styled', 'top', 'top-start', 'top-end', 'top-left', 'top-right', 'center', 'center-start', 'center-end', 'center-left', 'center-right', 'bottom', 'bottom-start', 'bottom-end', 'bottom-left', 'bottom-right', 'grow-row', 'grow-column', 'grow-fullscreen', 'rtl', 'timer-progress-bar', 'timer-progress-bar-container', 'scrollbar-measure', 'icon-success', 'icon-warning', 'icon-info', 'icon-question', 'icon-error'];
      var swalClasses = classNames.reduce(function (acc, className) {
        acc[className] = swalPrefix + className;
        return acc;
      }, /** @type {SwalClasses} */{});

      /** @type {SwalIcon[]} */
      var icons = ['success', 'warning', 'info', 'question', 'error'];
      var iconTypes = icons.reduce(function (acc, icon) {
        acc[icon] = swalPrefix + icon;
        return acc;
      }, /** @type {SwalIcons} */{});

      var consolePrefix = 'SweetAlert2:';

      /**
       * Capitalize the first letter of a string
       *
       * @param {string} str
       * @returns {string}
       */
      var capitalizeFirstLetter = function capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      /**
       * Standardize console warnings
       *
       * @param {string | string[]} message
       */
      var warn = function warn(message) {
        console.warn("".concat(consolePrefix, " ").concat(_typeof(message) === 'object' ? message.join(' ') : message));
      };

      /**
       * Standardize console errors
       *
       * @param {string} message
       */
      var error = function error(message) {
        console.error("".concat(consolePrefix, " ").concat(message));
      };

      /**
       * Private global state for `warnOnce`
       *
       * @type {string[]}
       * @private
       */
      var previousWarnOnceMessages = [];

      /**
       * Show a console warning, but only if it hasn't already been shown
       *
       * @param {string} message
       */
      var warnOnce = function warnOnce(message) {
        if (!previousWarnOnceMessages.includes(message)) {
          previousWarnOnceMessages.push(message);
          warn(message);
        }
      };

      /**
       * Show a one-time console warning about deprecated params/methods
       *
       * @param {string} deprecatedParam
       * @param {string} useInstead
       */
      var warnAboutDeprecation = function warnAboutDeprecation(deprecatedParam, useInstead) {
        warnOnce("\"".concat(deprecatedParam, "\" is deprecated and will be removed in the next major release. Please use \"").concat(useInstead, "\" instead."));
      };

      /**
       * If `arg` is a function, call it (with no arguments or context) and return the result.
       * Otherwise, just pass the value through
       *
       * @param {Function | any} arg
       * @returns {any}
       */
      var callIfFunction = function callIfFunction(arg) {
        return typeof arg === 'function' ? arg() : arg;
      };

      /**
       * @param {any} arg
       * @returns {boolean}
       */
      var hasToPromiseFn = function hasToPromiseFn(arg) {
        return arg && typeof arg.toPromise === 'function';
      };

      /**
       * @param {any} arg
       * @returns {Promise<any>}
       */
      var asPromise = function asPromise(arg) {
        return hasToPromiseFn(arg) ? arg.toPromise() : Promise.resolve(arg);
      };

      /**
       * @param {any} arg
       * @returns {boolean}
       */
      var isPromise = function isPromise(arg) {
        return arg && Promise.resolve(arg) === arg;
      };

      /**
       * Gets the popup container which contains the backdrop and the popup itself.
       *
       * @returns {HTMLElement | null}
       */
      var getContainer = function getContainer() {
        return document.body.querySelector(".".concat(swalClasses.container));
      };

      /**
       * @param {string} selectorString
       * @returns {HTMLElement | null}
       */
      var elementBySelector = function elementBySelector(selectorString) {
        var container = getContainer();
        return container ? container.querySelector(selectorString) : null;
      };

      /**
       * @param {string} className
       * @returns {HTMLElement | null}
       */
      var elementByClass = function elementByClass(className) {
        return elementBySelector(".".concat(className));
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getPopup = function getPopup() {
        return elementByClass(swalClasses.popup);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getIcon = function getIcon() {
        return elementByClass(swalClasses.icon);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getIconContent = function getIconContent() {
        return elementByClass(swalClasses['icon-content']);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getTitle = function getTitle() {
        return elementByClass(swalClasses.title);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getHtmlContainer = function getHtmlContainer() {
        return elementByClass(swalClasses['html-container']);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getImage = function getImage() {
        return elementByClass(swalClasses.image);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getProgressSteps = function getProgressSteps() {
        return elementByClass(swalClasses['progress-steps']);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getValidationMessage = function getValidationMessage() {
        return elementByClass(swalClasses['validation-message']);
      };

      /**
       * @returns {HTMLButtonElement | null}
       */
      var getConfirmButton = function getConfirmButton() {
        return /** @type {HTMLButtonElement} */elementBySelector(".".concat(swalClasses.actions, " .").concat(swalClasses.confirm));
      };

      /**
       * @returns {HTMLButtonElement | null}
       */
      var getCancelButton = function getCancelButton() {
        return /** @type {HTMLButtonElement} */elementBySelector(".".concat(swalClasses.actions, " .").concat(swalClasses.cancel));
      };

      /**
       * @returns {HTMLButtonElement | null}
       */
      var getDenyButton = function getDenyButton() {
        return /** @type {HTMLButtonElement} */elementBySelector(".".concat(swalClasses.actions, " .").concat(swalClasses.deny));
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getInputLabel = function getInputLabel() {
        return elementByClass(swalClasses['input-label']);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getLoader = function getLoader() {
        return elementBySelector(".".concat(swalClasses.loader));
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getActions = function getActions() {
        return elementByClass(swalClasses.actions);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getFooter = function getFooter() {
        return elementByClass(swalClasses.footer);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getTimerProgressBar = function getTimerProgressBar() {
        return elementByClass(swalClasses['timer-progress-bar']);
      };

      /**
       * @returns {HTMLElement | null}
       */
      var getCloseButton = function getCloseButton() {
        return elementByClass(swalClasses.close);
      };

      // https://github.com/jkup/focusable/blob/master/index.js
      var focusable = "\n  a[href],\n  area[href],\n  input:not([disabled]),\n  select:not([disabled]),\n  textarea:not([disabled]),\n  button:not([disabled]),\n  iframe,\n  object,\n  embed,\n  [tabindex=\"0\"],\n  [contenteditable],\n  audio[controls],\n  video[controls],\n  summary\n";
      /**
       * @returns {HTMLElement[]}
       */
      var getFocusableElements = function getFocusableElements() {
        var popup = getPopup();
        if (!popup) {
          return [];
        }
        /** @type {NodeListOf<HTMLElement>} */
        var focusableElementsWithTabindex = popup.querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])');
        var focusableElementsWithTabindexSorted = Array.from(focusableElementsWithTabindex)
        // sort according to tabindex
        .sort(function (a, b) {
          var tabindexA = parseInt(a.getAttribute('tabindex') || '0');
          var tabindexB = parseInt(b.getAttribute('tabindex') || '0');
          if (tabindexA > tabindexB) {
            return 1;
          } else if (tabindexA < tabindexB) {
            return -1;
          }
          return 0;
        });

        /** @type {NodeListOf<HTMLElement>} */
        var otherFocusableElements = popup.querySelectorAll(focusable);
        var otherFocusableElementsFiltered = Array.from(otherFocusableElements).filter(function (el) {
          return el.getAttribute('tabindex') !== '-1';
        });
        return _toConsumableArray(new Set(focusableElementsWithTabindexSorted.concat(otherFocusableElementsFiltered))).filter(function (el) {
          return isVisible$1(el);
        });
      };

      /**
       * @returns {boolean}
       */
      var isModal = function isModal() {
        return hasClass(document.body, swalClasses.shown) && !hasClass(document.body, swalClasses['toast-shown']) && !hasClass(document.body, swalClasses['no-backdrop']);
      };

      /**
       * @returns {boolean}
       */
      var isToast = function isToast() {
        var popup = getPopup();
        if (!popup) {
          return false;
        }
        return hasClass(popup, swalClasses.toast);
      };

      /**
       * @returns {boolean}
       */
      var isLoading = function isLoading() {
        var popup = getPopup();
        if (!popup) {
          return false;
        }
        return popup.hasAttribute('data-loading');
      };

      /**
       * Securely set innerHTML of an element
       * https://github.com/sweetalert2/sweetalert2/issues/1926
       *
       * @param {HTMLElement} elem
       * @param {string} html
       */
      var setInnerHtml = function setInnerHtml(elem, html) {
        elem.textContent = '';
        if (html) {
          var parser = new DOMParser();
          var parsed = parser.parseFromString(html, "text/html");
          var head = parsed.querySelector('head');
          head && Array.from(head.childNodes).forEach(function (child) {
            elem.appendChild(child);
          });
          var body = parsed.querySelector('body');
          body && Array.from(body.childNodes).forEach(function (child) {
            if (child instanceof HTMLVideoElement || child instanceof HTMLAudioElement) {
              elem.appendChild(child.cloneNode(true)); // https://github.com/sweetalert2/sweetalert2/issues/2507
            } else {
              elem.appendChild(child);
            }
          });
        }
      };

      /**
       * @param {HTMLElement} elem
       * @param {string} className
       * @returns {boolean}
       */
      var hasClass = function hasClass(elem, className) {
        if (!className) {
          return false;
        }
        var classList = className.split(/\s+/);
        for (var i = 0; i < classList.length; i++) {
          if (!elem.classList.contains(classList[i])) {
            return false;
          }
        }
        return true;
      };

      /**
       * @param {HTMLElement} elem
       * @param {SweetAlertOptions} params
       */
      var removeCustomClasses = function removeCustomClasses(elem, params) {
        Array.from(elem.classList).forEach(function (className) {
          if (!Object.values(swalClasses).includes(className) && !Object.values(iconTypes).includes(className) && !Object.values(params.showClass || {}).includes(className)) {
            elem.classList.remove(className);
          }
        });
      };

      /**
       * @param {HTMLElement} elem
       * @param {SweetAlertOptions} params
       * @param {string} className
       */
      var applyCustomClass = function applyCustomClass(elem, params, className) {
        removeCustomClasses(elem, params);
        if (params.customClass && params.customClass[className]) {
          if (typeof params.customClass[className] !== 'string' && !params.customClass[className].forEach) {
            warn("Invalid type of customClass.".concat(className, "! Expected string or iterable object, got \"").concat(_typeof(params.customClass[className]), "\""));
            return;
          }
          addClass(elem, params.customClass[className]);
        }
      };

      /**
       * @param {HTMLElement} popup
       * @param {import('./renderers/renderInput').InputClass | SweetAlertInput} inputClass
       * @returns {HTMLInputElement | null}
       */
      var getInput$1 = function getInput(popup, inputClass) {
        if (!inputClass) {
          return null;
        }
        switch (inputClass) {
          case 'select':
          case 'textarea':
          case 'file':
            return popup.querySelector(".".concat(swalClasses.popup, " > .").concat(swalClasses[inputClass]));
          case 'checkbox':
            return popup.querySelector(".".concat(swalClasses.popup, " > .").concat(swalClasses.checkbox, " input"));
          case 'radio':
            return popup.querySelector(".".concat(swalClasses.popup, " > .").concat(swalClasses.radio, " input:checked")) || popup.querySelector(".".concat(swalClasses.popup, " > .").concat(swalClasses.radio, " input:first-child"));
          case 'range':
            return popup.querySelector(".".concat(swalClasses.popup, " > .").concat(swalClasses.range, " input"));
          default:
            return popup.querySelector(".".concat(swalClasses.popup, " > .").concat(swalClasses.input));
        }
      };

      /**
       * @param {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} input
       */
      var focusInput = function focusInput(input) {
        input.focus();

        // place cursor at end of text in text input
        if (input.type !== 'file') {
          // http://stackoverflow.com/a/2345915
          var val = input.value;
          input.value = '';
          input.value = val;
        }
      };

      /**
       * @param {HTMLElement | HTMLElement[] | null} target
       * @param {string | string[] | readonly string[] | undefined} classList
       * @param {boolean} condition
       */
      var toggleClass = function toggleClass(target, classList, condition) {
        if (!target || !classList) {
          return;
        }
        if (typeof classList === 'string') {
          classList = classList.split(/\s+/).filter(Boolean);
        }
        classList.forEach(function (className) {
          if (Array.isArray(target)) {
            target.forEach(function (elem) {
              condition ? elem.classList.add(className) : elem.classList.remove(className);
            });
          } else {
            condition ? target.classList.add(className) : target.classList.remove(className);
          }
        });
      };

      /**
       * @param {HTMLElement | HTMLElement[] | null} target
       * @param {string | string[] | readonly string[] | undefined} classList
       */
      var addClass = function addClass(target, classList) {
        toggleClass(target, classList, true);
      };

      /**
       * @param {HTMLElement | HTMLElement[] | null} target
       * @param {string | string[] | readonly string[] | undefined} classList
       */
      var removeClass = function removeClass(target, classList) {
        toggleClass(target, classList, false);
      };

      /**
       * Get direct child of an element by class name
       *
       * @param {HTMLElement} elem
       * @param {string} className
       * @returns {HTMLElement | undefined}
       */
      var getDirectChildByClass = function getDirectChildByClass(elem, className) {
        var children = Array.from(elem.children);
        for (var i = 0; i < children.length; i++) {
          var child = children[i];
          if (child instanceof HTMLElement && hasClass(child, className)) {
            return child;
          }
        }
      };

      /**
       * @param {HTMLElement} elem
       * @param {string} property
       * @param {*} value
       */
      var applyNumericalStyle = function applyNumericalStyle(elem, property, value) {
        if (value === "".concat(parseInt(value))) {
          value = parseInt(value);
        }
        if (value || parseInt(value) === 0) {
          elem.style.setProperty(property, typeof value === 'number' ? "".concat(value, "px") : value);
        } else {
          elem.style.removeProperty(property);
        }
      };

      /**
       * @param {HTMLElement | null} elem
       * @param {string} display
       */
      var show = function show(elem) {
        var display = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'flex';
        elem && (elem.style.display = display);
      };

      /**
       * @param {HTMLElement | null} elem
       */
      var hide = function hide(elem) {
        elem && (elem.style.display = 'none');
      };

      /**
       * @param {HTMLElement | null} elem
       * @param {string} display
       */
      var showWhenInnerHtmlPresent = function showWhenInnerHtmlPresent(elem) {
        var display = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'block';
        if (!elem) {
          return;
        }
        new MutationObserver(function () {
          toggle(elem, elem.innerHTML, display);
        }).observe(elem, {
          childList: true,
          subtree: true
        });
      };

      /**
       * @param {HTMLElement} parent
       * @param {string} selector
       * @param {string} property
       * @param {string} value
       */
      var setStyle = function setStyle(parent, selector, property, value) {
        /** @type {HTMLElement | null} */
        var el = parent.querySelector(selector);
        if (el) {
          el.style.setProperty(property, value);
        }
      };

      /**
       * @param {HTMLElement} elem
       * @param {any} condition
       * @param {string} display
       */
      var toggle = function toggle(elem, condition) {
        var display = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'flex';
        condition ? show(elem, display) : hide(elem);
      };

      /**
       * borrowed from jquery $(elem).is(':visible') implementation
       *
       * @param {HTMLElement | null} elem
       * @returns {boolean}
       */
      var isVisible$1 = function isVisible(elem) {
        return !!(elem && (elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length));
      };

      /**
       * @returns {boolean}
       */
      var allButtonsAreHidden = function allButtonsAreHidden() {
        return !isVisible$1(getConfirmButton()) && !isVisible$1(getDenyButton()) && !isVisible$1(getCancelButton());
      };

      /**
       * @param {HTMLElement} elem
       * @returns {boolean}
       */
      var isScrollable = function isScrollable(elem) {
        return !!(elem.scrollHeight > elem.clientHeight);
      };

      /**
       * borrowed from https://stackoverflow.com/a/46352119
       *
       * @param {HTMLElement} elem
       * @returns {boolean}
       */
      var hasCssAnimation = function hasCssAnimation(elem) {
        var style = window.getComputedStyle(elem);
        var animDuration = parseFloat(style.getPropertyValue('animation-duration') || '0');
        var transDuration = parseFloat(style.getPropertyValue('transition-duration') || '0');
        return animDuration > 0 || transDuration > 0;
      };

      /**
       * @param {number} timer
       * @param {boolean} reset
       */
      var animateTimerProgressBar = function animateTimerProgressBar(timer) {
        var reset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var timerProgressBar = getTimerProgressBar();
        if (!timerProgressBar) {
          return;
        }
        if (isVisible$1(timerProgressBar)) {
          if (reset) {
            timerProgressBar.style.transition = 'none';
            timerProgressBar.style.width = '100%';
          }
          setTimeout(function () {
            timerProgressBar.style.transition = "width ".concat(timer / 1000, "s linear");
            timerProgressBar.style.width = '0%';
          }, 10);
        }
      };
      var stopTimerProgressBar = function stopTimerProgressBar() {
        var timerProgressBar = getTimerProgressBar();
        if (!timerProgressBar) {
          return;
        }
        var timerProgressBarWidth = parseInt(window.getComputedStyle(timerProgressBar).width);
        timerProgressBar.style.removeProperty('transition');
        timerProgressBar.style.width = '100%';
        var timerProgressBarFullWidth = parseInt(window.getComputedStyle(timerProgressBar).width);
        var timerProgressBarPercent = timerProgressBarWidth / timerProgressBarFullWidth * 100;
        timerProgressBar.style.width = "".concat(timerProgressBarPercent, "%");
      };

      /**
       * Detect Node env
       *
       * @returns {boolean}
       */
      var isNodeEnv = function isNodeEnv() {
        return typeof window === 'undefined' || typeof document === 'undefined';
      };

      var sweetHTML = "\n <div aria-labelledby=\"".concat(swalClasses.title, "\" aria-describedby=\"").concat(swalClasses['html-container'], "\" class=\"").concat(swalClasses.popup, "\" tabindex=\"-1\">\n   <button type=\"button\" class=\"").concat(swalClasses.close, "\"></button>\n   <ul class=\"").concat(swalClasses['progress-steps'], "\"></ul>\n   <div class=\"").concat(swalClasses.icon, "\"></div>\n   <img class=\"").concat(swalClasses.image, "\" />\n   <h2 class=\"").concat(swalClasses.title, "\" id=\"").concat(swalClasses.title, "\"></h2>\n   <div class=\"").concat(swalClasses['html-container'], "\" id=\"").concat(swalClasses['html-container'], "\"></div>\n   <input class=\"").concat(swalClasses.input, "\" id=\"").concat(swalClasses.input, "\" />\n   <input type=\"file\" class=\"").concat(swalClasses.file, "\" />\n   <div class=\"").concat(swalClasses.range, "\">\n     <input type=\"range\" />\n     <output></output>\n   </div>\n   <select class=\"").concat(swalClasses.select, "\" id=\"").concat(swalClasses.select, "\"></select>\n   <div class=\"").concat(swalClasses.radio, "\"></div>\n   <label class=\"").concat(swalClasses.checkbox, "\">\n     <input type=\"checkbox\" id=\"").concat(swalClasses.checkbox, "\" />\n     <span class=\"").concat(swalClasses.label, "\"></span>\n   </label>\n   <textarea class=\"").concat(swalClasses.textarea, "\" id=\"").concat(swalClasses.textarea, "\"></textarea>\n   <div class=\"").concat(swalClasses['validation-message'], "\" id=\"").concat(swalClasses['validation-message'], "\"></div>\n   <div class=\"").concat(swalClasses.actions, "\">\n     <div class=\"").concat(swalClasses.loader, "\"></div>\n     <button type=\"button\" class=\"").concat(swalClasses.confirm, "\"></button>\n     <button type=\"button\" class=\"").concat(swalClasses.deny, "\"></button>\n     <button type=\"button\" class=\"").concat(swalClasses.cancel, "\"></button>\n   </div>\n   <div class=\"").concat(swalClasses.footer, "\"></div>\n   <div class=\"").concat(swalClasses['timer-progress-bar-container'], "\">\n     <div class=\"").concat(swalClasses['timer-progress-bar'], "\"></div>\n   </div>\n </div>\n").replace(/(^|\n)\s*/g, '');

      /**
       * @returns {boolean}
       */
      var resetOldContainer = function resetOldContainer() {
        var oldContainer = getContainer();
        if (!oldContainer) {
          return false;
        }
        oldContainer.remove();
        removeClass([document.documentElement, document.body], [swalClasses['no-backdrop'], swalClasses['toast-shown'], swalClasses['has-column']]);
        return true;
      };
      var resetValidationMessage$1 = function resetValidationMessage() {
        globalState.currentInstance.resetValidationMessage();
      };
      var addInputChangeListeners = function addInputChangeListeners() {
        var popup = getPopup();
        var input = getDirectChildByClass(popup, swalClasses.input);
        var file = getDirectChildByClass(popup, swalClasses.file);
        /** @type {HTMLInputElement} */
        var range = popup.querySelector(".".concat(swalClasses.range, " input"));
        /** @type {HTMLOutputElement} */
        var rangeOutput = popup.querySelector(".".concat(swalClasses.range, " output"));
        var select = getDirectChildByClass(popup, swalClasses.select);
        /** @type {HTMLInputElement} */
        var checkbox = popup.querySelector(".".concat(swalClasses.checkbox, " input"));
        var textarea = getDirectChildByClass(popup, swalClasses.textarea);
        input.oninput = resetValidationMessage$1;
        file.onchange = resetValidationMessage$1;
        select.onchange = resetValidationMessage$1;
        checkbox.onchange = resetValidationMessage$1;
        textarea.oninput = resetValidationMessage$1;
        range.oninput = function () {
          resetValidationMessage$1();
          rangeOutput.value = range.value;
        };
        range.onchange = function () {
          resetValidationMessage$1();
          rangeOutput.value = range.value;
        };
      };

      /**
       * @param {string | HTMLElement} target
       * @returns {HTMLElement}
       */
      var getTarget = function getTarget(target) {
        return typeof target === 'string' ? document.querySelector(target) : target;
      };

      /**
       * @param {SweetAlertOptions} params
       */
      var setupAccessibility = function setupAccessibility(params) {
        var popup = getPopup();
        popup.setAttribute('role', params.toast ? 'alert' : 'dialog');
        popup.setAttribute('aria-live', params.toast ? 'polite' : 'assertive');
        if (!params.toast) {
          popup.setAttribute('aria-modal', 'true');
        }
      };

      /**
       * @param {HTMLElement} targetElement
       */
      var setupRTL = function setupRTL(targetElement) {
        if (window.getComputedStyle(targetElement).direction === 'rtl') {
          addClass(getContainer(), swalClasses.rtl);
        }
      };

      /**
       * Add modal + backdrop + no-war message for Russians to DOM
       *
       * @param {SweetAlertOptions} params
       */
      var init = function init(params) {
        // Clean up the old popup container if it exists
        var oldContainerExisted = resetOldContainer();
        if (isNodeEnv()) {
          error('SweetAlert2 requires document to initialize');
          return;
        }
        var container = document.createElement('div');
        container.className = swalClasses.container;
        if (oldContainerExisted) {
          addClass(container, swalClasses['no-transition']);
        }
        setInnerHtml(container, sweetHTML);
        var targetElement = getTarget(params.target);
        targetElement.appendChild(container);
        setupAccessibility(params);
        setupRTL(targetElement);
        addInputChangeListeners();
      };

      /**
       * @param {HTMLElement | object | string} param
       * @param {HTMLElement} target
       */
      var parseHtmlToContainer = function parseHtmlToContainer(param, target) {
        // DOM element
        if (param instanceof HTMLElement) {
          target.appendChild(param);
        }

        // Object
        else if (_typeof(param) === 'object') {
          handleObject(param, target);
        }

        // Plain string
        else if (param) {
          setInnerHtml(target, param);
        }
      };

      /**
       * @param {any} param
       * @param {HTMLElement} target
       */
      var handleObject = function handleObject(param, target) {
        // JQuery element(s)
        if (param.jquery) {
          handleJqueryElem(target, param);
        }

        // For other objects use their string representation
        else {
          setInnerHtml(target, param.toString());
        }
      };

      /**
       * @param {HTMLElement} target
       * @param {any} elem
       */
      var handleJqueryElem = function handleJqueryElem(target, elem) {
        target.textContent = '';
        if (0 in elem) {
          for (var i = 0; (i in elem); i++) {
            target.appendChild(elem[i].cloneNode(true));
          }
        } else {
          target.appendChild(elem.cloneNode(true));
        }
      };

      /**
       * @returns {'webkitAnimationEnd' | 'animationend' | false}
       */
      var animationEndEvent = function () {
        // Prevent run in Node env
        if (isNodeEnv()) {
          return false;
        }
        var testEl = document.createElement('div');

        // Chrome, Safari and Opera
        if (typeof testEl.style.webkitAnimation !== 'undefined') {
          return 'webkitAnimationEnd';
        }

        // Standard syntax
        if (typeof testEl.style.animation !== 'undefined') {
          return 'animationend';
        }
        return false;
      }();

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderActions = function renderActions(instance, params) {
        var actions = getActions();
        var loader = getLoader();
        if (!actions || !loader) {
          return;
        }

        // Actions (buttons) wrapper
        if (!params.showConfirmButton && !params.showDenyButton && !params.showCancelButton) {
          hide(actions);
        } else {
          show(actions);
        }

        // Custom class
        applyCustomClass(actions, params, 'actions');

        // Render all the buttons
        renderButtons(actions, loader, params);

        // Loader
        setInnerHtml(loader, params.loaderHtml || '');
        applyCustomClass(loader, params, 'loader');
      };

      /**
       * @param {HTMLElement} actions
       * @param {HTMLElement} loader
       * @param {SweetAlertOptions} params
       */
      function renderButtons(actions, loader, params) {
        var confirmButton = getConfirmButton();
        var denyButton = getDenyButton();
        var cancelButton = getCancelButton();
        if (!confirmButton || !denyButton || !cancelButton) {
          return;
        }

        // Render buttons
        renderButton(confirmButton, 'confirm', params);
        renderButton(denyButton, 'deny', params);
        renderButton(cancelButton, 'cancel', params);
        handleButtonsStyling(confirmButton, denyButton, cancelButton, params);
        if (params.reverseButtons) {
          if (params.toast) {
            actions.insertBefore(cancelButton, confirmButton);
            actions.insertBefore(denyButton, confirmButton);
          } else {
            actions.insertBefore(cancelButton, loader);
            actions.insertBefore(denyButton, loader);
            actions.insertBefore(confirmButton, loader);
          }
        }
      }

      /**
       * @param {HTMLElement} confirmButton
       * @param {HTMLElement} denyButton
       * @param {HTMLElement} cancelButton
       * @param {SweetAlertOptions} params
       */
      function handleButtonsStyling(confirmButton, denyButton, cancelButton, params) {
        if (!params.buttonsStyling) {
          removeClass([confirmButton, denyButton, cancelButton], swalClasses.styled);
          return;
        }
        addClass([confirmButton, denyButton, cancelButton], swalClasses.styled);

        // Buttons background colors
        if (params.confirmButtonColor) {
          confirmButton.style.backgroundColor = params.confirmButtonColor;
          addClass(confirmButton, swalClasses['default-outline']);
        }
        if (params.denyButtonColor) {
          denyButton.style.backgroundColor = params.denyButtonColor;
          addClass(denyButton, swalClasses['default-outline']);
        }
        if (params.cancelButtonColor) {
          cancelButton.style.backgroundColor = params.cancelButtonColor;
          addClass(cancelButton, swalClasses['default-outline']);
        }
      }

      /**
       * @param {HTMLElement} button
       * @param {'confirm' | 'deny' | 'cancel'} buttonType
       * @param {SweetAlertOptions} params
       */
      function renderButton(button, buttonType, params) {
        var buttonName = /** @type {'Confirm' | 'Deny' | 'Cancel'} */capitalizeFirstLetter(buttonType);
        toggle(button, params["show".concat(buttonName, "Button")], 'inline-block');
        setInnerHtml(button, params["".concat(buttonType, "ButtonText")] || ''); // Set caption text
        button.setAttribute('aria-label', params["".concat(buttonType, "ButtonAriaLabel")] || ''); // ARIA label

        // Add buttons custom classes
        button.className = swalClasses[buttonType];
        applyCustomClass(button, params, "".concat(buttonType, "Button"));
      }

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderCloseButton = function renderCloseButton(instance, params) {
        var closeButton = getCloseButton();
        if (!closeButton) {
          return;
        }
        setInnerHtml(closeButton, params.closeButtonHtml || '');

        // Custom class
        applyCustomClass(closeButton, params, 'closeButton');
        toggle(closeButton, params.showCloseButton);
        closeButton.setAttribute('aria-label', params.closeButtonAriaLabel || '');
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderContainer = function renderContainer(instance, params) {
        var container = getContainer();
        if (!container) {
          return;
        }
        handleBackdropParam(container, params.backdrop);
        handlePositionParam(container, params.position);
        handleGrowParam(container, params.grow);

        // Custom class
        applyCustomClass(container, params, 'container');
      };

      /**
       * @param {HTMLElement} container
       * @param {SweetAlertOptions['backdrop']} backdrop
       */
      function handleBackdropParam(container, backdrop) {
        if (typeof backdrop === 'string') {
          container.style.background = backdrop;
        } else if (!backdrop) {
          addClass([document.documentElement, document.body], swalClasses['no-backdrop']);
        }
      }

      /**
       * @param {HTMLElement} container
       * @param {SweetAlertOptions['position']} position
       */
      function handlePositionParam(container, position) {
        if (!position) {
          return;
        }
        if (position in swalClasses) {
          addClass(container, swalClasses[position]);
        } else {
          warn('The "position" parameter is not valid, defaulting to "center"');
          addClass(container, swalClasses.center);
        }
      }

      /**
       * @param {HTMLElement} container
       * @param {SweetAlertOptions['grow']} grow
       */
      function handleGrowParam(container, grow) {
        if (!grow) {
          return;
        }
        addClass(container, swalClasses["grow-".concat(grow)]);
      }

      /**
       * This module contains `WeakMap`s for each effectively-"private  property" that a `Swal` has.
       * For example, to set the private property "foo" of `this` to "bar", you can `privateProps.foo.set(this, 'bar')`
       * This is the approach that Babel will probably take to implement private methods/fields
       *   https://github.com/tc39/proposal-private-methods
       *   https://github.com/babel/babel/pull/7555
       * Once we have the changes from that PR in Babel, and our core class fits reasonable in *one module*
       *   then we can use that language feature.
       */

      var privateProps = {
        innerParams: new WeakMap(),
        domCache: new WeakMap()
      };

      /** @type {InputClass[]} */
      var inputClasses = ['input', 'file', 'range', 'select', 'radio', 'checkbox', 'textarea'];

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderInput = function renderInput(instance, params) {
        var popup = getPopup();
        if (!popup) {
          return;
        }
        var innerParams = privateProps.innerParams.get(instance);
        var rerender = !innerParams || params.input !== innerParams.input;
        inputClasses.forEach(function (inputClass) {
          var inputContainer = getDirectChildByClass(popup, swalClasses[inputClass]);
          if (!inputContainer) {
            return;
          }

          // set attributes
          setAttributes(inputClass, params.inputAttributes);

          // set class
          inputContainer.className = swalClasses[inputClass];
          if (rerender) {
            hide(inputContainer);
          }
        });
        if (params.input) {
          if (rerender) {
            showInput(params);
          }
          // set custom class
          setCustomClass(params);
        }
      };

      /**
       * @param {SweetAlertOptions} params
       */
      var showInput = function showInput(params) {
        if (!params.input) {
          return;
        }
        if (!renderInputType[params.input]) {
          error("Unexpected type of input! Expected ".concat(Object.keys(renderInputType).join(' | '), ", got \"").concat(params.input, "\""));
          return;
        }
        var inputContainer = getInputContainer(params.input);
        var input = renderInputType[params.input](inputContainer, params);
        show(inputContainer);

        // input autofocus
        if (params.inputAutoFocus) {
          setTimeout(function () {
            focusInput(input);
          });
        }
      };

      /**
       * @param {HTMLInputElement} input
       */
      var removeAttributes = function removeAttributes(input) {
        for (var i = 0; i < input.attributes.length; i++) {
          var attrName = input.attributes[i].name;
          if (!['id', 'type', 'value', 'style'].includes(attrName)) {
            input.removeAttribute(attrName);
          }
        }
      };

      /**
       * @param {InputClass} inputClass
       * @param {SweetAlertOptions['inputAttributes']} inputAttributes
       */
      var setAttributes = function setAttributes(inputClass, inputAttributes) {
        var input = getInput$1(getPopup(), inputClass);
        if (!input) {
          return;
        }
        removeAttributes(input);
        for (var attr in inputAttributes) {
          input.setAttribute(attr, inputAttributes[attr]);
        }
      };

      /**
       * @param {SweetAlertOptions} params
       */
      var setCustomClass = function setCustomClass(params) {
        var inputContainer = getInputContainer(params.input);
        if (_typeof(params.customClass) === 'object') {
          addClass(inputContainer, params.customClass.input);
        }
      };

      /**
       * @param {HTMLInputElement | HTMLTextAreaElement} input
       * @param {SweetAlertOptions} params
       */
      var setInputPlaceholder = function setInputPlaceholder(input, params) {
        if (!input.placeholder || params.inputPlaceholder) {
          input.placeholder = params.inputPlaceholder;
        }
      };

      /**
       * @param {Input} input
       * @param {Input} prependTo
       * @param {SweetAlertOptions} params
       */
      var setInputLabel = function setInputLabel(input, prependTo, params) {
        if (params.inputLabel) {
          var label = document.createElement('label');
          var labelClass = swalClasses['input-label'];
          label.setAttribute('for', input.id);
          label.className = labelClass;
          if (_typeof(params.customClass) === 'object') {
            addClass(label, params.customClass.inputLabel);
          }
          label.innerText = params.inputLabel;
          prependTo.insertAdjacentElement('beforebegin', label);
        }
      };

      /**
       * @param {SweetAlertOptions['input']} inputType
       * @returns {HTMLElement}
       */
      var getInputContainer = function getInputContainer(inputType) {
        return getDirectChildByClass(getPopup(), swalClasses[inputType] || swalClasses.input);
      };

      /**
       * @param {HTMLInputElement | HTMLOutputElement | HTMLTextAreaElement} input
       * @param {SweetAlertOptions['inputValue']} inputValue
       */
      var checkAndSetInputValue = function checkAndSetInputValue(input, inputValue) {
        if (['string', 'number'].includes(_typeof(inputValue))) {
          input.value = "".concat(inputValue);
        } else if (!isPromise(inputValue)) {
          warn("Unexpected type of inputValue! Expected \"string\", \"number\" or \"Promise\", got \"".concat(_typeof(inputValue), "\""));
        }
      };

      /** @type {Record<SweetAlertInput, (input: Input | HTMLElement, params: SweetAlertOptions) => Input>} */
      var renderInputType = {};

      /**
       * @param {HTMLInputElement} input
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.text = renderInputType.email = renderInputType.password = renderInputType.number = renderInputType.tel = renderInputType.url = renderInputType.search = renderInputType.date = renderInputType['datetime-local'] = renderInputType.time = renderInputType.week = renderInputType.month = function (input, params) {
        checkAndSetInputValue(input, params.inputValue);
        setInputLabel(input, input, params);
        setInputPlaceholder(input, params);
        input.type = params.input;
        return input;
      };

      /**
       * @param {HTMLInputElement} input
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.file = function (input, params) {
        setInputLabel(input, input, params);
        setInputPlaceholder(input, params);
        return input;
      };

      /**
       * @param {HTMLInputElement} range
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.range = function (range, params) {
        var rangeInput = range.querySelector('input');
        var rangeOutput = range.querySelector('output');
        checkAndSetInputValue(rangeInput, params.inputValue);
        rangeInput.type = params.input;
        checkAndSetInputValue(rangeOutput, params.inputValue);
        setInputLabel(rangeInput, range, params);
        return range;
      };

      /**
       * @param {HTMLSelectElement} select
       * @param {SweetAlertOptions} params
       * @returns {HTMLSelectElement}
       */
      renderInputType.select = function (select, params) {
        select.textContent = '';
        if (params.inputPlaceholder) {
          var placeholder = document.createElement('option');
          setInnerHtml(placeholder, params.inputPlaceholder);
          placeholder.value = '';
          placeholder.disabled = true;
          placeholder.selected = true;
          select.appendChild(placeholder);
        }
        setInputLabel(select, select, params);
        return select;
      };

      /**
       * @param {HTMLInputElement} radio
       * @returns {HTMLInputElement}
       */
      renderInputType.radio = function (radio) {
        radio.textContent = '';
        return radio;
      };

      /**
       * @param {HTMLLabelElement} checkboxContainer
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.checkbox = function (checkboxContainer, params) {
        var checkbox = getInput$1(getPopup(), 'checkbox');
        checkbox.value = '1';
        checkbox.checked = Boolean(params.inputValue);
        var label = checkboxContainer.querySelector('span');
        setInnerHtml(label, params.inputPlaceholder);
        return checkbox;
      };

      /**
       * @param {HTMLTextAreaElement} textarea
       * @param {SweetAlertOptions} params
       * @returns {HTMLTextAreaElement}
       */
      renderInputType.textarea = function (textarea, params) {
        checkAndSetInputValue(textarea, params.inputValue);
        setInputPlaceholder(textarea, params);
        setInputLabel(textarea, textarea, params);

        /**
         * @param {HTMLElement} el
         * @returns {number}
         */
        var getMargin = function getMargin(el) {
          return parseInt(window.getComputedStyle(el).marginLeft) + parseInt(window.getComputedStyle(el).marginRight);
        };

        // https://github.com/sweetalert2/sweetalert2/issues/2291
        setTimeout(function () {
          // https://github.com/sweetalert2/sweetalert2/issues/1699
          if ('MutationObserver' in window) {
            var initialPopupWidth = parseInt(window.getComputedStyle(getPopup()).width);
            var textareaResizeHandler = function textareaResizeHandler() {
              // check if texarea is still in document (i.e. popup wasn't closed in the meantime)
              if (!document.body.contains(textarea)) {
                return;
              }
              var textareaWidth = textarea.offsetWidth + getMargin(textarea);
              if (textareaWidth > initialPopupWidth) {
                getPopup().style.width = "".concat(textareaWidth, "px");
              } else {
                applyNumericalStyle(getPopup(), 'width', params.width);
              }
            };
            new MutationObserver(textareaResizeHandler).observe(textarea, {
              attributes: true,
              attributeFilter: ['style']
            });
          }
        });
        return textarea;
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderContent = function renderContent(instance, params) {
        var htmlContainer = getHtmlContainer();
        if (!htmlContainer) {
          return;
        }
        showWhenInnerHtmlPresent(htmlContainer);
        applyCustomClass(htmlContainer, params, 'htmlContainer');

        // Content as HTML
        if (params.html) {
          parseHtmlToContainer(params.html, htmlContainer);
          show(htmlContainer, 'block');
        }

        // Content as plain text
        else if (params.text) {
          htmlContainer.textContent = params.text;
          show(htmlContainer, 'block');
        }

        // No content
        else {
          hide(htmlContainer);
        }
        renderInput(instance, params);
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderFooter = function renderFooter(instance, params) {
        var footer = getFooter();
        if (!footer) {
          return;
        }
        showWhenInnerHtmlPresent(footer);
        toggle(footer, params.footer, 'block');
        if (params.footer) {
          parseHtmlToContainer(params.footer, footer);
        }

        // Custom class
        applyCustomClass(footer, params, 'footer');
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderIcon = function renderIcon(instance, params) {
        var innerParams = privateProps.innerParams.get(instance);
        var icon = getIcon();
        if (!icon) {
          return;
        }

        // if the given icon already rendered, apply the styling without re-rendering the icon
        if (innerParams && params.icon === innerParams.icon) {
          // Custom or default content
          setContent(icon, params);
          applyStyles(icon, params);
          return;
        }
        if (!params.icon && !params.iconHtml) {
          hide(icon);
          return;
        }
        if (params.icon && Object.keys(iconTypes).indexOf(params.icon) === -1) {
          error("Unknown icon! Expected \"success\", \"error\", \"warning\", \"info\" or \"question\", got \"".concat(params.icon, "\""));
          hide(icon);
          return;
        }
        show(icon);

        // Custom or default content
        setContent(icon, params);
        applyStyles(icon, params);

        // Animate icon
        addClass(icon, params.showClass && params.showClass.icon);
      };

      /**
       * @param {HTMLElement} icon
       * @param {SweetAlertOptions} params
       */
      var applyStyles = function applyStyles(icon, params) {
        for (var _i = 0, _Object$entries = Object.entries(iconTypes); _i < _Object$entries.length; _i++) {
          var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
            iconType = _Object$entries$_i[0],
            iconClassName = _Object$entries$_i[1];
          if (params.icon !== iconType) {
            removeClass(icon, iconClassName);
          }
        }
        addClass(icon, params.icon && iconTypes[params.icon]);

        // Icon color
        setColor(icon, params);

        // Success icon background color
        adjustSuccessIconBackgroundColor();

        // Custom class
        applyCustomClass(icon, params, 'icon');
      };

      // Adjust success icon background color to match the popup background color
      var adjustSuccessIconBackgroundColor = function adjustSuccessIconBackgroundColor() {
        var popup = getPopup();
        if (!popup) {
          return;
        }
        var popupBackgroundColor = window.getComputedStyle(popup).getPropertyValue('background-color');
        /** @type {NodeListOf<HTMLElement>} */
        var successIconParts = popup.querySelectorAll('[class^=swal2-success-circular-line], .swal2-success-fix');
        for (var i = 0; i < successIconParts.length; i++) {
          successIconParts[i].style.backgroundColor = popupBackgroundColor;
        }
      };
      var successIconHtml = "\n  <div class=\"swal2-success-circular-line-left\"></div>\n  <span class=\"swal2-success-line-tip\"></span> <span class=\"swal2-success-line-long\"></span>\n  <div class=\"swal2-success-ring\"></div> <div class=\"swal2-success-fix\"></div>\n  <div class=\"swal2-success-circular-line-right\"></div>\n";
      var errorIconHtml = "\n  <span class=\"swal2-x-mark\">\n    <span class=\"swal2-x-mark-line-left\"></span>\n    <span class=\"swal2-x-mark-line-right\"></span>\n  </span>\n";

      /**
       * @param {HTMLElement} icon
       * @param {SweetAlertOptions} params
       */
      var setContent = function setContent(icon, params) {
        if (!params.icon && !params.iconHtml) {
          return;
        }
        var oldContent = icon.innerHTML;
        var newContent = '';
        if (params.iconHtml) {
          newContent = iconContent(params.iconHtml);
        } else if (params.icon === 'success') {
          newContent = successIconHtml;
          oldContent = oldContent.replace(/ style=".*?"/g, ''); // undo adjustSuccessIconBackgroundColor()
        } else if (params.icon === 'error') {
          newContent = errorIconHtml;
        } else if (params.icon) {
          var defaultIconHtml = {
            question: '?',
            warning: '!',
            info: 'i'
          };
          newContent = iconContent(defaultIconHtml[params.icon]);
        }
        if (oldContent.trim() !== newContent.trim()) {
          setInnerHtml(icon, newContent);
        }
      };

      /**
       * @param {HTMLElement} icon
       * @param {SweetAlertOptions} params
       */
      var setColor = function setColor(icon, params) {
        if (!params.iconColor) {
          return;
        }
        icon.style.color = params.iconColor;
        icon.style.borderColor = params.iconColor;
        for (var _i2 = 0, _arr = ['.swal2-success-line-tip', '.swal2-success-line-long', '.swal2-x-mark-line-left', '.swal2-x-mark-line-right']; _i2 < _arr.length; _i2++) {
          var sel = _arr[_i2];
          setStyle(icon, sel, 'background-color', params.iconColor);
        }
        setStyle(icon, '.swal2-success-ring', 'border-color', params.iconColor);
      };

      /**
       * @param {string} content
       * @returns {string}
       */
      var iconContent = function iconContent(content) {
        return "<div class=\"".concat(swalClasses['icon-content'], "\">").concat(content, "</div>");
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderImage = function renderImage(instance, params) {
        var image = getImage();
        if (!image) {
          return;
        }
        if (!params.imageUrl) {
          hide(image);
          return;
        }
        show(image, '');

        // Src, alt
        image.setAttribute('src', params.imageUrl);
        image.setAttribute('alt', params.imageAlt || '');

        // Width, height
        applyNumericalStyle(image, 'width', params.imageWidth);
        applyNumericalStyle(image, 'height', params.imageHeight);

        // Class
        image.className = swalClasses.image;
        applyCustomClass(image, params, 'image');
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderPopup = function renderPopup(instance, params) {
        var container = getContainer();
        var popup = getPopup();
        if (!container || !popup) {
          return;
        }

        // Width
        // https://github.com/sweetalert2/sweetalert2/issues/2170
        if (params.toast) {
          applyNumericalStyle(container, 'width', params.width);
          popup.style.width = '100%';
          var loader = getLoader();
          loader && popup.insertBefore(loader, getIcon());
        } else {
          applyNumericalStyle(popup, 'width', params.width);
        }

        // Padding
        applyNumericalStyle(popup, 'padding', params.padding);

        // Color
        if (params.color) {
          popup.style.color = params.color;
        }

        // Background
        if (params.background) {
          popup.style.background = params.background;
        }
        hide(getValidationMessage());

        // Classes
        addClasses$1(popup, params);
      };

      /**
       * @param {HTMLElement} popup
       * @param {SweetAlertOptions} params
       */
      var addClasses$1 = function addClasses(popup, params) {
        var showClass = params.showClass || {};
        // Default Class + showClass when updating Swal.update({})
        popup.className = "".concat(swalClasses.popup, " ").concat(isVisible$1(popup) ? showClass.popup : '');
        if (params.toast) {
          addClass([document.documentElement, document.body], swalClasses['toast-shown']);
          addClass(popup, swalClasses.toast);
        } else {
          addClass(popup, swalClasses.modal);
        }

        // Custom class
        applyCustomClass(popup, params, 'popup');
        if (typeof params.customClass === 'string') {
          addClass(popup, params.customClass);
        }

        // Icon class (#1842)
        if (params.icon) {
          addClass(popup, swalClasses["icon-".concat(params.icon)]);
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderProgressSteps = function renderProgressSteps(instance, params) {
        var progressStepsContainer = getProgressSteps();
        if (!progressStepsContainer) {
          return;
        }
        var progressSteps = params.progressSteps,
          currentProgressStep = params.currentProgressStep;
        if (!progressSteps || progressSteps.length === 0 || currentProgressStep === undefined) {
          hide(progressStepsContainer);
          return;
        }
        show(progressStepsContainer);
        progressStepsContainer.textContent = '';
        if (currentProgressStep >= progressSteps.length) {
          warn('Invalid currentProgressStep parameter, it should be less than progressSteps.length ' + '(currentProgressStep like JS arrays starts from 0)');
        }
        progressSteps.forEach(function (step, index) {
          var stepEl = createStepElement(step);
          progressStepsContainer.appendChild(stepEl);
          if (index === currentProgressStep) {
            addClass(stepEl, swalClasses['active-progress-step']);
          }
          if (index !== progressSteps.length - 1) {
            var lineEl = createLineElement(params);
            progressStepsContainer.appendChild(lineEl);
          }
        });
      };

      /**
       * @param {string} step
       * @returns {HTMLLIElement}
       */
      var createStepElement = function createStepElement(step) {
        var stepEl = document.createElement('li');
        addClass(stepEl, swalClasses['progress-step']);
        setInnerHtml(stepEl, step);
        return stepEl;
      };

      /**
       * @param {SweetAlertOptions} params
       * @returns {HTMLLIElement}
       */
      var createLineElement = function createLineElement(params) {
        var lineEl = document.createElement('li');
        addClass(lineEl, swalClasses['progress-step-line']);
        if (params.progressStepsDistance) {
          applyNumericalStyle(lineEl, 'width', params.progressStepsDistance);
        }
        return lineEl;
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var renderTitle = function renderTitle(instance, params) {
        var title = getTitle();
        if (!title) {
          return;
        }
        showWhenInnerHtmlPresent(title);
        toggle(title, params.title || params.titleText, 'block');
        if (params.title) {
          parseHtmlToContainer(params.title, title);
        }
        if (params.titleText) {
          title.innerText = params.titleText;
        }

        // Custom class
        applyCustomClass(title, params, 'title');
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var render = function render(instance, params) {
        renderPopup(instance, params);
        renderContainer(instance, params);
        renderProgressSteps(instance, params);
        renderIcon(instance, params);
        renderImage(instance, params);
        renderTitle(instance, params);
        renderCloseButton(instance, params);
        renderContent(instance, params);
        renderActions(instance, params);
        renderFooter(instance, params);
        var popup = getPopup();
        if (typeof params.didRender === 'function' && popup) {
          params.didRender(popup);
        }
      };

      /*
       * Global function to determine if SweetAlert2 popup is shown
       */
      var isVisible = function isVisible() {
        return isVisible$1(getPopup());
      };

      /*
       * Global function to click 'Confirm' button
       */
      var clickConfirm = function clickConfirm() {
        var _dom$getConfirmButton;
        return (_dom$getConfirmButton = getConfirmButton()) === null || _dom$getConfirmButton === void 0 ? void 0 : _dom$getConfirmButton.click();
      };

      /*
       * Global function to click 'Deny' button
       */
      var clickDeny = function clickDeny() {
        var _dom$getDenyButton;
        return (_dom$getDenyButton = getDenyButton()) === null || _dom$getDenyButton === void 0 ? void 0 : _dom$getDenyButton.click();
      };

      /*
       * Global function to click 'Cancel' button
       */
      var clickCancel = function clickCancel() {
        var _dom$getCancelButton;
        return (_dom$getCancelButton = getCancelButton()) === null || _dom$getCancelButton === void 0 ? void 0 : _dom$getCancelButton.click();
      };

      /** @typedef {'cancel' | 'backdrop' | 'close' | 'esc' | 'timer'} DismissReason */

      /** @type {Record<DismissReason, DismissReason>} */
      var DismissReason = Object.freeze({
        cancel: 'cancel',
        backdrop: 'backdrop',
        close: 'close',
        esc: 'esc',
        timer: 'timer'
      });

      /**
       * @param {GlobalState} globalState
       */
      var removeKeydownHandler = function removeKeydownHandler(globalState) {
        if (globalState.keydownTarget && globalState.keydownHandlerAdded) {
          globalState.keydownTarget.removeEventListener('keydown', globalState.keydownHandler, {
            capture: globalState.keydownListenerCapture
          });
          globalState.keydownHandlerAdded = false;
        }
      };

      /**
       * @param {GlobalState} globalState
       * @param {SweetAlertOptions} innerParams
       * @param {*} dismissWith
       */
      var addKeydownHandler = function addKeydownHandler(globalState, innerParams, dismissWith) {
        removeKeydownHandler(globalState);
        if (!innerParams.toast) {
          globalState.keydownHandler = function (e) {
            return keydownHandler(innerParams, e, dismissWith);
          };
          globalState.keydownTarget = innerParams.keydownListenerCapture ? window : getPopup();
          globalState.keydownListenerCapture = innerParams.keydownListenerCapture;
          globalState.keydownTarget.addEventListener('keydown', globalState.keydownHandler, {
            capture: globalState.keydownListenerCapture
          });
          globalState.keydownHandlerAdded = true;
        }
      };

      /**
       * @param {number} index
       * @param {number} increment
       */
      var setFocus = function setFocus(index, increment) {
        var _dom$getPopup;
        var focusableElements = getFocusableElements();
        // search for visible elements and select the next possible match
        if (focusableElements.length) {
          index = index + increment;

          // rollover to first item
          if (index === focusableElements.length) {
            index = 0;

            // go to last item
          } else if (index === -1) {
            index = focusableElements.length - 1;
          }
          focusableElements[index].focus();
          return;
        }
        // no visible focusable elements, focus the popup
        (_dom$getPopup = getPopup()) === null || _dom$getPopup === void 0 || _dom$getPopup.focus();
      };
      var arrowKeysNextButton = ['ArrowRight', 'ArrowDown'];
      var arrowKeysPreviousButton = ['ArrowLeft', 'ArrowUp'];

      /**
       * @param {SweetAlertOptions} innerParams
       * @param {KeyboardEvent} event
       * @param {Function} dismissWith
       */
      var keydownHandler = function keydownHandler(innerParams, event, dismissWith) {
        if (!innerParams) {
          return; // This instance has already been destroyed
        }

        // Ignore keydown during IME composition
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/keydown_event#ignoring_keydown_during_ime_composition
        // https://github.com/sweetalert2/sweetalert2/issues/720
        // https://github.com/sweetalert2/sweetalert2/issues/2406
        if (event.isComposing || event.keyCode === 229) {
          return;
        }
        if (innerParams.stopKeydownPropagation) {
          event.stopPropagation();
        }

        // ENTER
        if (event.key === 'Enter') {
          handleEnter(event, innerParams);
        }

        // TAB
        else if (event.key === 'Tab') {
          handleTab(event);
        }

        // ARROWS - switch focus between buttons
        else if ([].concat(arrowKeysNextButton, arrowKeysPreviousButton).includes(event.key)) {
          handleArrows(event.key);
        }

        // ESC
        else if (event.key === 'Escape') {
          handleEsc(event, innerParams, dismissWith);
        }
      };

      /**
       * @param {KeyboardEvent} event
       * @param {SweetAlertOptions} innerParams
       */
      var handleEnter = function handleEnter(event, innerParams) {
        // https://github.com/sweetalert2/sweetalert2/issues/2386
        if (!callIfFunction(innerParams.allowEnterKey)) {
          return;
        }
        var input = getInput$1(getPopup(), innerParams.input);
        if (event.target && input && event.target instanceof HTMLElement && event.target.outerHTML === input.outerHTML) {
          if (['textarea', 'file'].includes(innerParams.input)) {
            return; // do not submit
          }
          clickConfirm();
          event.preventDefault();
        }
      };

      /**
       * @param {KeyboardEvent} event
       */
      var handleTab = function handleTab(event) {
        var targetElement = event.target;
        var focusableElements = getFocusableElements();
        var btnIndex = -1;
        for (var i = 0; i < focusableElements.length; i++) {
          if (targetElement === focusableElements[i]) {
            btnIndex = i;
            break;
          }
        }

        // Cycle to the next button
        if (!event.shiftKey) {
          setFocus(btnIndex, 1);
        }

        // Cycle to the prev button
        else {
          setFocus(btnIndex, -1);
        }
        event.stopPropagation();
        event.preventDefault();
      };

      /**
       * @param {string} key
       */
      var handleArrows = function handleArrows(key) {
        var actions = getActions();
        var confirmButton = getConfirmButton();
        var denyButton = getDenyButton();
        var cancelButton = getCancelButton();
        if (!actions || !confirmButton || !denyButton || !cancelButton) {
          return;
        }
        /** @type HTMLElement[] */
        var buttons = [confirmButton, denyButton, cancelButton];
        if (document.activeElement instanceof HTMLElement && !buttons.includes(document.activeElement)) {
          return;
        }
        var sibling = arrowKeysNextButton.includes(key) ? 'nextElementSibling' : 'previousElementSibling';
        var buttonToFocus = document.activeElement;
        if (!buttonToFocus) {
          return;
        }
        for (var i = 0; i < actions.children.length; i++) {
          buttonToFocus = buttonToFocus[sibling];
          if (!buttonToFocus) {
            return;
          }
          if (buttonToFocus instanceof HTMLButtonElement && isVisible$1(buttonToFocus)) {
            break;
          }
        }
        if (buttonToFocus instanceof HTMLButtonElement) {
          buttonToFocus.focus();
        }
      };

      /**
       * @param {KeyboardEvent} event
       * @param {SweetAlertOptions} innerParams
       * @param {Function} dismissWith
       */
      var handleEsc = function handleEsc(event, innerParams, dismissWith) {
        if (callIfFunction(innerParams.allowEscapeKey)) {
          event.preventDefault();
          dismissWith(DismissReason.esc);
        }
      };

      /**
       * This module contains `WeakMap`s for each effectively-"private  property" that a `Swal` has.
       * For example, to set the private property "foo" of `this` to "bar", you can `privateProps.foo.set(this, 'bar')`
       * This is the approach that Babel will probably take to implement private methods/fields
       *   https://github.com/tc39/proposal-private-methods
       *   https://github.com/babel/babel/pull/7555
       * Once we have the changes from that PR in Babel, and our core class fits reasonable in *one module*
       *   then we can use that language feature.
       */

      var privateMethods = {
        swalPromiseResolve: new WeakMap(),
        swalPromiseReject: new WeakMap()
      };

      // From https://developer.paciellogroup.com/blog/2018/06/the-current-state-of-modal-dialog-accessibility/
      // Adding aria-hidden="true" to elements outside of the active modal dialog ensures that
      // elements not within the active modal dialog will not be surfaced if a user opens a screen
      // reader’s list of elements (headings, form controls, landmarks, etc.) in the document.

      var setAriaHidden = function setAriaHidden() {
        var container = getContainer();
        var bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(function (el) {
          if (el.contains(container)) {
            return;
          }
          if (el.hasAttribute('aria-hidden')) {
            el.setAttribute('data-previous-aria-hidden', el.getAttribute('aria-hidden') || '');
          }
          el.setAttribute('aria-hidden', 'true');
        });
      };
      var unsetAriaHidden = function unsetAriaHidden() {
        var bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(function (el) {
          if (el.hasAttribute('data-previous-aria-hidden')) {
            el.setAttribute('aria-hidden', el.getAttribute('data-previous-aria-hidden') || '');
            el.removeAttribute('data-previous-aria-hidden');
          } else {
            el.removeAttribute('aria-hidden');
          }
        });
      };

      // @ts-ignore
      var isSafariOrIOS = typeof window !== 'undefined' && !!window.GestureEvent; // true for Safari desktop + all iOS browsers https://stackoverflow.com/a/70585394

      /**
       * Fix iOS scrolling
       * http://stackoverflow.com/q/39626302
       */
      var iOSfix = function iOSfix() {
        if (isSafariOrIOS && !hasClass(document.body, swalClasses.iosfix)) {
          var offset = document.body.scrollTop;
          document.body.style.top = "".concat(offset * -1, "px");
          addClass(document.body, swalClasses.iosfix);
          lockBodyScroll();
        }
      };

      /**
       * https://github.com/sweetalert2/sweetalert2/issues/1246
       */
      var lockBodyScroll = function lockBodyScroll() {
        var container = getContainer();
        if (!container) {
          return;
        }
        /** @type {boolean} */
        var preventTouchMove;
        /**
         * @param {TouchEvent} event
         */
        container.ontouchstart = function (event) {
          preventTouchMove = shouldPreventTouchMove(event);
        };
        /**
         * @param {TouchEvent} event
         */
        container.ontouchmove = function (event) {
          if (preventTouchMove) {
            event.preventDefault();
            event.stopPropagation();
          }
        };
      };

      /**
       * @param {TouchEvent} event
       * @returns {boolean}
       */
      var shouldPreventTouchMove = function shouldPreventTouchMove(event) {
        var target = event.target;
        var container = getContainer();
        var htmlContainer = getHtmlContainer();
        if (!container || !htmlContainer) {
          return false;
        }
        if (isStylus(event) || isZoom(event)) {
          return false;
        }
        if (target === container) {
          return true;
        }
        if (!isScrollable(container) && target instanceof HTMLElement && target.tagName !== 'INPUT' &&
        // #1603
        target.tagName !== 'TEXTAREA' &&
        // #2266
        !(isScrollable(htmlContainer) &&
        // #1944
        htmlContainer.contains(target))) {
          return true;
        }
        return false;
      };

      /**
       * https://github.com/sweetalert2/sweetalert2/issues/1786
       *
       * @param {*} event
       * @returns {boolean}
       */
      var isStylus = function isStylus(event) {
        return event.touches && event.touches.length && event.touches[0].touchType === 'stylus';
      };

      /**
       * https://github.com/sweetalert2/sweetalert2/issues/1891
       *
       * @param {TouchEvent} event
       * @returns {boolean}
       */
      var isZoom = function isZoom(event) {
        return event.touches && event.touches.length > 1;
      };
      var undoIOSfix = function undoIOSfix() {
        if (hasClass(document.body, swalClasses.iosfix)) {
          var offset = parseInt(document.body.style.top, 10);
          removeClass(document.body, swalClasses.iosfix);
          document.body.style.top = '';
          document.body.scrollTop = offset * -1;
        }
      };

      /**
       * Measure scrollbar width for padding body during modal show/hide
       * https://github.com/twbs/bootstrap/blob/master/js/src/modal.js
       *
       * @returns {number}
       */
      var measureScrollbar = function measureScrollbar() {
        var scrollDiv = document.createElement('div');
        scrollDiv.className = swalClasses['scrollbar-measure'];
        document.body.appendChild(scrollDiv);
        var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        return scrollbarWidth;
      };

      /**
       * Remember state in cases where opening and handling a modal will fiddle with it.
       * @type {number | null}
       */
      var previousBodyPadding = null;

      /**
       * @param {string} initialBodyOverflow
       */
      var replaceScrollbarWithPadding = function replaceScrollbarWithPadding(initialBodyOverflow) {
        // for queues, do not do this more than once
        if (previousBodyPadding !== null) {
          return;
        }
        // if the body has overflow
        if (document.body.scrollHeight > window.innerHeight || initialBodyOverflow === 'scroll' // https://github.com/sweetalert2/sweetalert2/issues/2663
        ) {
          // add padding so the content doesn't shift after removal of scrollbar
          previousBodyPadding = parseInt(window.getComputedStyle(document.body).getPropertyValue('padding-right'));
          document.body.style.paddingRight = "".concat(previousBodyPadding + measureScrollbar(), "px");
        }
      };
      var undoReplaceScrollbarWithPadding = function undoReplaceScrollbarWithPadding() {
        if (previousBodyPadding !== null) {
          document.body.style.paddingRight = "".concat(previousBodyPadding, "px");
          previousBodyPadding = null;
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {HTMLElement} container
       * @param {boolean} returnFocus
       * @param {Function} didClose
       */
      function removePopupAndResetState(instance, container, returnFocus, didClose) {
        if (isToast()) {
          triggerDidCloseAndDispose(instance, didClose);
        } else {
          restoreActiveElement(returnFocus).then(function () {
            return triggerDidCloseAndDispose(instance, didClose);
          });
          removeKeydownHandler(globalState);
        }

        // workaround for https://github.com/sweetalert2/sweetalert2/issues/2088
        // for some reason removing the container in Safari will scroll the document to bottom
        if (isSafariOrIOS) {
          container.setAttribute('style', 'display:none !important');
          container.removeAttribute('class');
          container.innerHTML = '';
        } else {
          container.remove();
        }
        if (isModal()) {
          undoReplaceScrollbarWithPadding();
          undoIOSfix();
          unsetAriaHidden();
        }
        removeBodyClasses();
      }

      /**
       * Remove SweetAlert2 classes from body
       */
      function removeBodyClasses() {
        removeClass([document.documentElement, document.body], [swalClasses.shown, swalClasses['height-auto'], swalClasses['no-backdrop'], swalClasses['toast-shown']]);
      }

      /**
       * Instance method to close sweetAlert
       *
       * @param {any} resolveValue
       */
      function close(resolveValue) {
        resolveValue = prepareResolveValue(resolveValue);
        var swalPromiseResolve = privateMethods.swalPromiseResolve.get(this);
        var didClose = triggerClosePopup(this);
        if (this.isAwaitingPromise) {
          // A swal awaiting for a promise (after a click on Confirm or Deny) cannot be dismissed anymore #2335
          if (!resolveValue.isDismissed) {
            handleAwaitingPromise(this);
            swalPromiseResolve(resolveValue);
          }
        } else if (didClose) {
          // Resolve Swal promise
          swalPromiseResolve(resolveValue);
        }
      }
      var triggerClosePopup = function triggerClosePopup(instance) {
        var popup = getPopup();
        if (!popup) {
          return false;
        }
        var innerParams = privateProps.innerParams.get(instance);
        if (!innerParams || hasClass(popup, innerParams.hideClass.popup)) {
          return false;
        }
        removeClass(popup, innerParams.showClass.popup);
        addClass(popup, innerParams.hideClass.popup);
        var backdrop = getContainer();
        removeClass(backdrop, innerParams.showClass.backdrop);
        addClass(backdrop, innerParams.hideClass.backdrop);
        handlePopupAnimation(instance, popup, innerParams);
        return true;
      };

      /**
       * @param {any} error
       */
      function rejectPromise(error) {
        var rejectPromise = privateMethods.swalPromiseReject.get(this);
        handleAwaitingPromise(this);
        if (rejectPromise) {
          // Reject Swal promise
          rejectPromise(error);
        }
      }

      /**
       * @param {SweetAlert} instance
       */
      var handleAwaitingPromise = function handleAwaitingPromise(instance) {
        if (instance.isAwaitingPromise) {
          delete instance.isAwaitingPromise;
          // The instance might have been previously partly destroyed, we must resume the destroy process in this case #2335
          if (!privateProps.innerParams.get(instance)) {
            instance._destroy();
          }
        }
      };

      /**
       * @param {any} resolveValue
       * @returns {SweetAlertResult}
       */
      var prepareResolveValue = function prepareResolveValue(resolveValue) {
        // When user calls Swal.close()
        if (typeof resolveValue === 'undefined') {
          return {
            isConfirmed: false,
            isDenied: false,
            isDismissed: true
          };
        }
        return Object.assign({
          isConfirmed: false,
          isDenied: false,
          isDismissed: false
        }, resolveValue);
      };

      /**
       * @param {SweetAlert} instance
       * @param {HTMLElement} popup
       * @param {SweetAlertOptions} innerParams
       */
      var handlePopupAnimation = function handlePopupAnimation(instance, popup, innerParams) {
        var container = getContainer();
        // If animation is supported, animate
        var animationIsSupported = animationEndEvent && hasCssAnimation(popup);
        if (typeof innerParams.willClose === 'function') {
          innerParams.willClose(popup);
        }
        if (animationIsSupported) {
          animatePopup(instance, popup, container, innerParams.returnFocus, innerParams.didClose);
        } else {
          // Otherwise, remove immediately
          removePopupAndResetState(instance, container, innerParams.returnFocus, innerParams.didClose);
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {HTMLElement} popup
       * @param {HTMLElement} container
       * @param {boolean} returnFocus
       * @param {Function} didClose
       */
      var animatePopup = function animatePopup(instance, popup, container, returnFocus, didClose) {
        if (!animationEndEvent) {
          return;
        }
        globalState.swalCloseEventFinishedCallback = removePopupAndResetState.bind(null, instance, container, returnFocus, didClose);
        popup.addEventListener(animationEndEvent, function (e) {
          if (e.target === popup) {
            globalState.swalCloseEventFinishedCallback();
            delete globalState.swalCloseEventFinishedCallback;
          }
        });
      };

      /**
       * @param {SweetAlert} instance
       * @param {Function} didClose
       */
      var triggerDidCloseAndDispose = function triggerDidCloseAndDispose(instance, didClose) {
        setTimeout(function () {
          if (typeof didClose === 'function') {
            didClose.bind(instance.params)();
          }
          // instance might have been destroyed already
          if (instance._destroy) {
            instance._destroy();
          }
        });
      };

      /**
       * Shows loader (spinner), this is useful with AJAX requests.
       * By default the loader be shown instead of the "Confirm" button.
       *
       * @param {HTMLButtonElement | null} [buttonToReplace]
       */
      var showLoading = function showLoading(buttonToReplace) {
        var popup = getPopup();
        if (!popup) {
          new Swal(); // eslint-disable-line no-new
        }
        popup = getPopup();
        if (!popup) {
          return;
        }
        var loader = getLoader();
        if (isToast()) {
          hide(getIcon());
        } else {
          replaceButton(popup, buttonToReplace);
        }
        show(loader);
        popup.setAttribute('data-loading', 'true');
        popup.setAttribute('aria-busy', 'true');
        popup.focus();
      };

      /**
       * @param {HTMLElement} popup
       * @param {HTMLButtonElement | null} [buttonToReplace]
       */
      var replaceButton = function replaceButton(popup, buttonToReplace) {
        var actions = getActions();
        var loader = getLoader();
        if (!actions || !loader) {
          return;
        }
        if (!buttonToReplace && isVisible$1(getConfirmButton())) {
          buttonToReplace = getConfirmButton();
        }
        show(actions);
        if (buttonToReplace) {
          hide(buttonToReplace);
          loader.setAttribute('data-button-to-replace', buttonToReplace.className);
          actions.insertBefore(loader, buttonToReplace);
        }
        addClass([popup, actions], swalClasses.loading);
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var handleInputOptionsAndValue = function handleInputOptionsAndValue(instance, params) {
        if (params.input === 'select' || params.input === 'radio') {
          handleInputOptions(instance, params);
        } else if (['text', 'email', 'number', 'tel', 'textarea'].some(function (i) {
          return i === params.input;
        }) && (hasToPromiseFn(params.inputValue) || isPromise(params.inputValue))) {
          showLoading(getConfirmButton());
          handleInputValue(instance, params);
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} innerParams
       * @returns {SweetAlertInputValue}
       */
      var getInputValue = function getInputValue(instance, innerParams) {
        var input = instance.getInput();
        if (!input) {
          return null;
        }
        switch (innerParams.input) {
          case 'checkbox':
            return getCheckboxValue(input);
          case 'radio':
            return getRadioValue(input);
          case 'file':
            return getFileValue(input);
          default:
            return innerParams.inputAutoTrim ? input.value.trim() : input.value;
        }
      };

      /**
       * @param {HTMLInputElement} input
       * @returns {number}
       */
      var getCheckboxValue = function getCheckboxValue(input) {
        return input.checked ? 1 : 0;
      };

      /**
       * @param {HTMLInputElement} input
       * @returns {string | null}
       */
      var getRadioValue = function getRadioValue(input) {
        return input.checked ? input.value : null;
      };

      /**
       * @param {HTMLInputElement} input
       * @returns {FileList | File | null}
       */
      var getFileValue = function getFileValue(input) {
        return input.files && input.files.length ? input.getAttribute('multiple') !== null ? input.files : input.files[0] : null;
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var handleInputOptions = function handleInputOptions(instance, params) {
        var popup = getPopup();
        if (!popup) {
          return;
        }
        /**
         * @param {Record<string, any>} inputOptions
         */
        var processInputOptions = function processInputOptions(inputOptions) {
          if (params.input === 'select') {
            populateSelectOptions(popup, formatInputOptions(inputOptions), params);
          } else if (params.input === 'radio') {
            populateRadioOptions(popup, formatInputOptions(inputOptions), params);
          }
        };
        if (hasToPromiseFn(params.inputOptions) || isPromise(params.inputOptions)) {
          showLoading(getConfirmButton());
          asPromise(params.inputOptions).then(function (inputOptions) {
            instance.hideLoading();
            processInputOptions(inputOptions);
          });
        } else if (_typeof(params.inputOptions) === 'object') {
          processInputOptions(params.inputOptions);
        } else {
          error("Unexpected type of inputOptions! Expected object, Map or Promise, got ".concat(_typeof(params.inputOptions)));
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertOptions} params
       */
      var handleInputValue = function handleInputValue(instance, params) {
        var input = instance.getInput();
        if (!input) {
          return;
        }
        hide(input);
        asPromise(params.inputValue).then(function (inputValue) {
          input.value = params.input === 'number' ? "".concat(parseFloat(inputValue) || 0) : "".concat(inputValue);
          show(input);
          input.focus();
          instance.hideLoading();
        })["catch"](function (err) {
          error("Error in inputValue promise: ".concat(err));
          input.value = '';
          show(input);
          input.focus();
          instance.hideLoading();
        });
      };

      /**
       * @param {HTMLElement} popup
       * @param {InputOptionFlattened[]} inputOptions
       * @param {SweetAlertOptions} params
       */
      function populateSelectOptions(popup, inputOptions, params) {
        var select = getDirectChildByClass(popup, swalClasses.select);
        if (!select) {
          return;
        }
        /**
         * @param {HTMLElement} parent
         * @param {string} optionLabel
         * @param {string} optionValue
         */
        var renderOption = function renderOption(parent, optionLabel, optionValue) {
          var option = document.createElement('option');
          option.value = optionValue;
          setInnerHtml(option, optionLabel);
          option.selected = isSelected(optionValue, params.inputValue);
          parent.appendChild(option);
        };
        inputOptions.forEach(function (inputOption) {
          var optionValue = inputOption[0];
          var optionLabel = inputOption[1];
          // <optgroup> spec:
          // https://www.w3.org/TR/html401/interact/forms.html#h-17.6
          // "...all OPTGROUP elements must be specified directly within a SELECT element (i.e., groups may not be nested)..."
          // check whether this is a <optgroup>
          if (Array.isArray(optionLabel)) {
            // if it is an array, then it is an <optgroup>
            var optgroup = document.createElement('optgroup');
            optgroup.label = optionValue;
            optgroup.disabled = false; // not configurable for now
            select.appendChild(optgroup);
            optionLabel.forEach(function (o) {
              return renderOption(optgroup, o[1], o[0]);
            });
          } else {
            // case of <option>
            renderOption(select, optionLabel, optionValue);
          }
        });
        select.focus();
      }

      /**
       * @param {HTMLElement} popup
       * @param {InputOptionFlattened[]} inputOptions
       * @param {SweetAlertOptions} params
       */
      function populateRadioOptions(popup, inputOptions, params) {
        var radio = getDirectChildByClass(popup, swalClasses.radio);
        if (!radio) {
          return;
        }
        inputOptions.forEach(function (inputOption) {
          var radioValue = inputOption[0];
          var radioLabel = inputOption[1];
          var radioInput = document.createElement('input');
          var radioLabelElement = document.createElement('label');
          radioInput.type = 'radio';
          radioInput.name = swalClasses.radio;
          radioInput.value = radioValue;
          if (isSelected(radioValue, params.inputValue)) {
            radioInput.checked = true;
          }
          var label = document.createElement('span');
          setInnerHtml(label, radioLabel);
          label.className = swalClasses.label;
          radioLabelElement.appendChild(radioInput);
          radioLabelElement.appendChild(label);
          radio.appendChild(radioLabelElement);
        });
        var radios = radio.querySelectorAll('input');
        if (radios.length) {
          radios[0].focus();
        }
      }

      /**
       * Converts `inputOptions` into an array of `[value, label]`s
       *
       * @param {Record<string, any>} inputOptions
       * @typedef {string[]} InputOptionFlattened
       * @returns {InputOptionFlattened[]}
       */
      var formatInputOptions = function formatInputOptions(inputOptions) {
        /** @type {InputOptionFlattened[]} */
        var result = [];
        if (inputOptions instanceof Map) {
          inputOptions.forEach(function (value, key) {
            var valueFormatted = value;
            if (_typeof(valueFormatted) === 'object') {
              // case of <optgroup>
              valueFormatted = formatInputOptions(valueFormatted);
            }
            result.push([key, valueFormatted]);
          });
        } else {
          Object.keys(inputOptions).forEach(function (key) {
            var valueFormatted = inputOptions[key];
            if (_typeof(valueFormatted) === 'object') {
              // case of <optgroup>
              valueFormatted = formatInputOptions(valueFormatted);
            }
            result.push([key, valueFormatted]);
          });
        }
        return result;
      };

      /**
       * @param {string} optionValue
       * @param {SweetAlertInputValue} inputValue
       * @returns {boolean}
       */
      var isSelected = function isSelected(optionValue, inputValue) {
        return !!inputValue && inputValue.toString() === optionValue.toString();
      };

      var _this = undefined;

      /**
       * @param {SweetAlert} instance
       */
      var handleConfirmButtonClick = function handleConfirmButtonClick(instance) {
        var innerParams = privateProps.innerParams.get(instance);
        instance.disableButtons();
        if (innerParams.input) {
          handleConfirmOrDenyWithInput(instance, 'confirm');
        } else {
          confirm(instance, true);
        }
      };

      /**
       * @param {SweetAlert} instance
       */
      var handleDenyButtonClick = function handleDenyButtonClick(instance) {
        var innerParams = privateProps.innerParams.get(instance);
        instance.disableButtons();
        if (innerParams.returnInputValueOnDeny) {
          handleConfirmOrDenyWithInput(instance, 'deny');
        } else {
          deny(instance, false);
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {Function} dismissWith
       */
      var handleCancelButtonClick = function handleCancelButtonClick(instance, dismissWith) {
        instance.disableButtons();
        dismissWith(DismissReason.cancel);
      };

      /**
       * @param {SweetAlert} instance
       * @param {'confirm' | 'deny'} type
       */
      var handleConfirmOrDenyWithInput = function handleConfirmOrDenyWithInput(instance, type) {
        var innerParams = privateProps.innerParams.get(instance);
        if (!innerParams.input) {
          error("The \"input\" parameter is needed to be set when using returnInputValueOn".concat(capitalizeFirstLetter(type)));
          return;
        }
        var input = instance.getInput();
        var inputValue = getInputValue(instance, innerParams);
        if (innerParams.inputValidator) {
          handleInputValidator(instance, inputValue, type);
        } else if (input && !input.checkValidity()) {
          instance.enableButtons();
          instance.showValidationMessage(innerParams.validationMessage || input.validationMessage);
        } else if (type === 'deny') {
          deny(instance, inputValue);
        } else {
          confirm(instance, inputValue);
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {SweetAlertInputValue} inputValue
       * @param {'confirm' | 'deny'} type
       */
      var handleInputValidator = function handleInputValidator(instance, inputValue, type) {
        var innerParams = privateProps.innerParams.get(instance);
        instance.disableInput();
        var validationPromise = Promise.resolve().then(function () {
          return asPromise(innerParams.inputValidator(inputValue, innerParams.validationMessage));
        });
        validationPromise.then(function (validationMessage) {
          instance.enableButtons();
          instance.enableInput();
          if (validationMessage) {
            instance.showValidationMessage(validationMessage);
          } else if (type === 'deny') {
            deny(instance, inputValue);
          } else {
            confirm(instance, inputValue);
          }
        });
      };

      /**
       * @param {SweetAlert} instance
       * @param {any} value
       */
      var deny = function deny(instance, value) {
        var innerParams = privateProps.innerParams.get(instance || _this);
        if (innerParams.showLoaderOnDeny) {
          showLoading(getDenyButton());
        }
        if (innerParams.preDeny) {
          instance.isAwaitingPromise = true; // Flagging the instance as awaiting a promise so it's own promise's reject/resolve methods doesn't get destroyed until the result from this preDeny's promise is received
          var preDenyPromise = Promise.resolve().then(function () {
            return asPromise(innerParams.preDeny(value, innerParams.validationMessage));
          });
          preDenyPromise.then(function (preDenyValue) {
            if (preDenyValue === false) {
              instance.hideLoading();
              handleAwaitingPromise(instance);
            } else {
              instance.close({
                isDenied: true,
                value: typeof preDenyValue === 'undefined' ? value : preDenyValue
              });
            }
          })["catch"](function (error) {
            return rejectWith(instance || _this, error);
          });
        } else {
          instance.close({
            isDenied: true,
            value: value
          });
        }
      };

      /**
       * @param {SweetAlert} instance
       * @param {any} value
       */
      var succeedWith = function succeedWith(instance, value) {
        instance.close({
          isConfirmed: true,
          value: value
        });
      };

      /**
       *
       * @param {SweetAlert} instance
       * @param {string} error
       */
      var rejectWith = function rejectWith(instance, error) {
        instance.rejectPromise(error);
      };

      /**
       *
       * @param {SweetAlert} instance
       * @param {any} value
       */
      var confirm = function confirm(instance, value) {
        var innerParams = privateProps.innerParams.get(instance || _this);
        if (innerParams.showLoaderOnConfirm) {
          showLoading();
        }
        if (innerParams.preConfirm) {
          instance.resetValidationMessage();
          instance.isAwaitingPromise = true; // Flagging the instance as awaiting a promise so it's own promise's reject/resolve methods doesn't get destroyed until the result from this preConfirm's promise is received
          var preConfirmPromise = Promise.resolve().then(function () {
            return asPromise(innerParams.preConfirm(value, innerParams.validationMessage));
          });
          preConfirmPromise.then(function (preConfirmValue) {
            if (isVisible$1(getValidationMessage()) || preConfirmValue === false) {
              instance.hideLoading();
              handleAwaitingPromise(instance);
            } else {
              succeedWith(instance, typeof preConfirmValue === 'undefined' ? value : preConfirmValue);
            }
          })["catch"](function (error) {
            return rejectWith(instance || _this, error);
          });
        } else {
          succeedWith(instance, value);
        }
      };

      /**
       * Hides loader and shows back the button which was hidden by .showLoading()
       */
      function hideLoading() {
        // do nothing if popup is closed
        var innerParams = privateProps.innerParams.get(this);
        if (!innerParams) {
          return;
        }
        var domCache = privateProps.domCache.get(this);
        hide(domCache.loader);
        if (isToast()) {
          if (innerParams.icon) {
            show(getIcon());
          }
        } else {
          showRelatedButton(domCache);
        }
        removeClass([domCache.popup, domCache.actions], swalClasses.loading);
        domCache.popup.removeAttribute('aria-busy');
        domCache.popup.removeAttribute('data-loading');
        domCache.confirmButton.disabled = false;
        domCache.denyButton.disabled = false;
        domCache.cancelButton.disabled = false;
      }
      var showRelatedButton = function showRelatedButton(domCache) {
        var buttonToReplace = domCache.popup.getElementsByClassName(domCache.loader.getAttribute('data-button-to-replace'));
        if (buttonToReplace.length) {
          show(buttonToReplace[0], 'inline-block');
        } else if (allButtonsAreHidden()) {
          hide(domCache.actions);
        }
      };

      /**
       * Gets the input DOM node, this method works with input parameter.
       *
       * @returns {HTMLInputElement | null}
       */
      function getInput() {
        var innerParams = privateProps.innerParams.get(this);
        var domCache = privateProps.domCache.get(this);
        if (!domCache) {
          return null;
        }
        return getInput$1(domCache.popup, innerParams.input);
      }

      /**
       * @param {SweetAlert} instance
       * @param {string[]} buttons
       * @param {boolean} disabled
       */
      function setButtonsDisabled(instance, buttons, disabled) {
        var domCache = privateProps.domCache.get(instance);
        buttons.forEach(function (button) {
          domCache[button].disabled = disabled;
        });
      }

      /**
       * @param {HTMLInputElement | null} input
       * @param {boolean} disabled
       */
      function setInputDisabled(input, disabled) {
        var popup = getPopup();
        if (!popup || !input) {
          return;
        }
        if (input.type === 'radio') {
          /** @type {NodeListOf<HTMLInputElement>} */
          var radios = popup.querySelectorAll("[name=\"".concat(swalClasses.radio, "\"]"));
          for (var i = 0; i < radios.length; i++) {
            radios[i].disabled = disabled;
          }
        } else {
          input.disabled = disabled;
        }
      }

      /**
       * Enable all the buttons
       * @this {SweetAlert}
       */
      function enableButtons() {
        setButtonsDisabled(this, ['confirmButton', 'denyButton', 'cancelButton'], false);
      }

      /**
       * Disable all the buttons
       * @this {SweetAlert}
       */
      function disableButtons() {
        setButtonsDisabled(this, ['confirmButton', 'denyButton', 'cancelButton'], true);
      }

      /**
       * Enable the input field
       * @this {SweetAlert}
       */
      function enableInput() {
        setInputDisabled(this.getInput(), false);
      }

      /**
       * Disable the input field
       * @this {SweetAlert}
       */
      function disableInput() {
        setInputDisabled(this.getInput(), true);
      }

      /**
       * Show block with validation message
       *
       * @param {string} error
       * @this {SweetAlert}
       */
      function showValidationMessage(error) {
        var domCache = privateProps.domCache.get(this);
        var params = privateProps.innerParams.get(this);
        setInnerHtml(domCache.validationMessage, error);
        domCache.validationMessage.className = swalClasses['validation-message'];
        if (params.customClass && params.customClass.validationMessage) {
          addClass(domCache.validationMessage, params.customClass.validationMessage);
        }
        show(domCache.validationMessage);
        var input = this.getInput();
        if (input) {
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-describedby', swalClasses['validation-message']);
          focusInput(input);
          addClass(input, swalClasses.inputerror);
        }
      }

      /**
       * Hide block with validation message
       *
       * @this {SweetAlert}
       */
      function resetValidationMessage() {
        var domCache = privateProps.domCache.get(this);
        if (domCache.validationMessage) {
          hide(domCache.validationMessage);
        }
        var input = this.getInput();
        if (input) {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
          removeClass(input, swalClasses.inputerror);
        }
      }

      var defaultParams = {
        title: '',
        titleText: '',
        text: '',
        html: '',
        footer: '',
        icon: undefined,
        iconColor: undefined,
        iconHtml: undefined,
        template: undefined,
        toast: false,
        animation: true,
        showClass: {
          popup: 'swal2-show',
          backdrop: 'swal2-backdrop-show',
          icon: 'swal2-icon-show'
        },
        hideClass: {
          popup: 'swal2-hide',
          backdrop: 'swal2-backdrop-hide',
          icon: 'swal2-icon-hide'
        },
        customClass: {},
        target: 'body',
        color: undefined,
        backdrop: true,
        heightAuto: true,
        allowOutsideClick: true,
        allowEscapeKey: true,
        allowEnterKey: true,
        stopKeydownPropagation: true,
        keydownListenerCapture: false,
        showConfirmButton: true,
        showDenyButton: false,
        showCancelButton: false,
        preConfirm: undefined,
        preDeny: undefined,
        confirmButtonText: 'OK',
        confirmButtonAriaLabel: '',
        confirmButtonColor: undefined,
        denyButtonText: 'No',
        denyButtonAriaLabel: '',
        denyButtonColor: undefined,
        cancelButtonText: 'Cancel',
        cancelButtonAriaLabel: '',
        cancelButtonColor: undefined,
        buttonsStyling: true,
        reverseButtons: false,
        focusConfirm: true,
        focusDeny: false,
        focusCancel: false,
        returnFocus: true,
        showCloseButton: false,
        closeButtonHtml: '&times;',
        closeButtonAriaLabel: 'Close this dialog',
        loaderHtml: '',
        showLoaderOnConfirm: false,
        showLoaderOnDeny: false,
        imageUrl: undefined,
        imageWidth: undefined,
        imageHeight: undefined,
        imageAlt: '',
        timer: undefined,
        timerProgressBar: false,
        width: undefined,
        padding: undefined,
        background: undefined,
        input: undefined,
        inputPlaceholder: '',
        inputLabel: '',
        inputValue: '',
        inputOptions: {},
        inputAutoFocus: true,
        inputAutoTrim: true,
        inputAttributes: {},
        inputValidator: undefined,
        returnInputValueOnDeny: false,
        validationMessage: undefined,
        grow: false,
        position: 'center',
        progressSteps: [],
        currentProgressStep: undefined,
        progressStepsDistance: undefined,
        willOpen: undefined,
        didOpen: undefined,
        didRender: undefined,
        willClose: undefined,
        didClose: undefined,
        didDestroy: undefined,
        scrollbarPadding: true
      };
      var updatableParams = ['allowEscapeKey', 'allowOutsideClick', 'background', 'buttonsStyling', 'cancelButtonAriaLabel', 'cancelButtonColor', 'cancelButtonText', 'closeButtonAriaLabel', 'closeButtonHtml', 'color', 'confirmButtonAriaLabel', 'confirmButtonColor', 'confirmButtonText', 'currentProgressStep', 'customClass', 'denyButtonAriaLabel', 'denyButtonColor', 'denyButtonText', 'didClose', 'didDestroy', 'footer', 'hideClass', 'html', 'icon', 'iconColor', 'iconHtml', 'imageAlt', 'imageHeight', 'imageUrl', 'imageWidth', 'preConfirm', 'preDeny', 'progressSteps', 'returnFocus', 'reverseButtons', 'showCancelButton', 'showCloseButton', 'showConfirmButton', 'showDenyButton', 'text', 'title', 'titleText', 'willClose'];

      /** @type {Record<string, string>} */
      var deprecatedParams = {};
      var toastIncompatibleParams = ['allowOutsideClick', 'allowEnterKey', 'backdrop', 'focusConfirm', 'focusDeny', 'focusCancel', 'returnFocus', 'heightAuto', 'keydownListenerCapture'];

      /**
       * Is valid parameter
       *
       * @param {string} paramName
       * @returns {boolean}
       */
      var isValidParameter = function isValidParameter(paramName) {
        return Object.prototype.hasOwnProperty.call(defaultParams, paramName);
      };

      /**
       * Is valid parameter for Swal.update() method
       *
       * @param {string} paramName
       * @returns {boolean}
       */
      var isUpdatableParameter = function isUpdatableParameter(paramName) {
        return updatableParams.indexOf(paramName) !== -1;
      };

      /**
       * Is deprecated parameter
       *
       * @param {string} paramName
       * @returns {string | undefined}
       */
      var isDeprecatedParameter = function isDeprecatedParameter(paramName) {
        return deprecatedParams[paramName];
      };

      /**
       * @param {string} param
       */
      var checkIfParamIsValid = function checkIfParamIsValid(param) {
        if (!isValidParameter(param)) {
          warn("Unknown parameter \"".concat(param, "\""));
        }
      };

      /**
       * @param {string} param
       */
      var checkIfToastParamIsValid = function checkIfToastParamIsValid(param) {
        if (toastIncompatibleParams.includes(param)) {
          warn("The parameter \"".concat(param, "\" is incompatible with toasts"));
        }
      };

      /**
       * @param {string} param
       */
      var checkIfParamIsDeprecated = function checkIfParamIsDeprecated(param) {
        var isDeprecated = isDeprecatedParameter(param);
        if (isDeprecated) {
          warnAboutDeprecation(param, isDeprecated);
        }
      };

      /**
       * Show relevant warnings for given params
       *
       * @param {SweetAlertOptions} params
       */
      var showWarningsForParams = function showWarningsForParams(params) {
        if (params.backdrop === false && params.allowOutsideClick) {
          warn('"allowOutsideClick" parameter requires `backdrop` parameter to be set to `true`');
        }
        for (var param in params) {
          checkIfParamIsValid(param);
          if (params.toast) {
            checkIfToastParamIsValid(param);
          }
          checkIfParamIsDeprecated(param);
        }
      };

      /**
       * Updates popup parameters.
       *
       * @param {SweetAlertOptions} params
       */
      function update(params) {
        var popup = getPopup();
        var innerParams = privateProps.innerParams.get(this);
        if (!popup || hasClass(popup, innerParams.hideClass.popup)) {
          warn("You're trying to update the closed or closing popup, that won't work. Use the update() method in preConfirm parameter or show a new popup.");
          return;
        }
        var validUpdatableParams = filterValidParams(params);
        var updatedParams = Object.assign({}, innerParams, validUpdatableParams);
        render(this, updatedParams);
        privateProps.innerParams.set(this, updatedParams);
        Object.defineProperties(this, {
          params: {
            value: Object.assign({}, this.params, params),
            writable: false,
            enumerable: true
          }
        });
      }

      /**
       * @param {SweetAlertOptions} params
       * @returns {SweetAlertOptions}
       */
      var filterValidParams = function filterValidParams(params) {
        var validUpdatableParams = {};
        Object.keys(params).forEach(function (param) {
          if (isUpdatableParameter(param)) {
            validUpdatableParams[param] = params[param];
          } else {
            warn("Invalid parameter to update: ".concat(param));
          }
        });
        return validUpdatableParams;
      };

      /**
       * Dispose the current SweetAlert2 instance
       */
      function _destroy() {
        var domCache = privateProps.domCache.get(this);
        var innerParams = privateProps.innerParams.get(this);
        if (!innerParams) {
          disposeWeakMaps(this); // The WeakMaps might have been partly destroyed, we must recall it to dispose any remaining WeakMaps #2335
          return; // This instance has already been destroyed
        }

        // Check if there is another Swal closing
        if (domCache.popup && globalState.swalCloseEventFinishedCallback) {
          globalState.swalCloseEventFinishedCallback();
          delete globalState.swalCloseEventFinishedCallback;
        }
        if (typeof innerParams.didDestroy === 'function') {
          innerParams.didDestroy();
        }
        disposeSwal(this);
      }

      /**
       * @param {SweetAlert} instance
       */
      var disposeSwal = function disposeSwal(instance) {
        disposeWeakMaps(instance);
        // Unset this.params so GC will dispose it (#1569)
        delete instance.params;
        // Unset globalState props so GC will dispose globalState (#1569)
        delete globalState.keydownHandler;
        delete globalState.keydownTarget;
        // Unset currentInstance
        delete globalState.currentInstance;
      };

      /**
       * @param {SweetAlert} instance
       */
      var disposeWeakMaps = function disposeWeakMaps(instance) {
        // If the current instance is awaiting a promise result, we keep the privateMethods to call them once the promise result is retrieved #2335
        if (instance.isAwaitingPromise) {
          unsetWeakMaps(privateProps, instance);
          instance.isAwaitingPromise = true;
        } else {
          unsetWeakMaps(privateMethods, instance);
          unsetWeakMaps(privateProps, instance);
          delete instance.isAwaitingPromise;
          // Unset instance methods
          delete instance.disableButtons;
          delete instance.enableButtons;
          delete instance.getInput;
          delete instance.disableInput;
          delete instance.enableInput;
          delete instance.hideLoading;
          delete instance.disableLoading;
          delete instance.showValidationMessage;
          delete instance.resetValidationMessage;
          delete instance.close;
          delete instance.closePopup;
          delete instance.closeModal;
          delete instance.closeToast;
          delete instance.rejectPromise;
          delete instance.update;
          delete instance._destroy;
        }
      };

      /**
       * @param {object} obj
       * @param {SweetAlert} instance
       */
      var unsetWeakMaps = function unsetWeakMaps(obj, instance) {
        for (var i in obj) {
          obj[i]["delete"](instance);
        }
      };

      var instanceMethods = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _destroy: _destroy,
        close: close,
        closeModal: close,
        closePopup: close,
        closeToast: close,
        disableButtons: disableButtons,
        disableInput: disableInput,
        disableLoading: hideLoading,
        enableButtons: enableButtons,
        enableInput: enableInput,
        getInput: getInput,
        handleAwaitingPromise: handleAwaitingPromise,
        hideLoading: hideLoading,
        rejectPromise: rejectPromise,
        resetValidationMessage: resetValidationMessage,
        showValidationMessage: showValidationMessage,
        update: update
      });

      /**
       * @param {SweetAlertOptions} innerParams
       * @param {DomCache} domCache
       * @param {Function} dismissWith
       */
      var handlePopupClick = function handlePopupClick(innerParams, domCache, dismissWith) {
        if (innerParams.toast) {
          handleToastClick(innerParams, domCache, dismissWith);
        } else {
          // Ignore click events that had mousedown on the popup but mouseup on the container
          // This can happen when the user drags a slider
          handleModalMousedown(domCache);

          // Ignore click events that had mousedown on the container but mouseup on the popup
          handleContainerMousedown(domCache);
          handleModalClick(innerParams, domCache, dismissWith);
        }
      };

      /**
       * @param {SweetAlertOptions} innerParams
       * @param {DomCache} domCache
       * @param {Function} dismissWith
       */
      var handleToastClick = function handleToastClick(innerParams, domCache, dismissWith) {
        // Closing toast by internal click
        domCache.popup.onclick = function () {
          if (innerParams && (isAnyButtonShown(innerParams) || innerParams.timer || innerParams.input)) {
            return;
          }
          dismissWith(DismissReason.close);
        };
      };

      /**
       * @param {SweetAlertOptions} innerParams
       * @returns {boolean}
       */
      var isAnyButtonShown = function isAnyButtonShown(innerParams) {
        return !!(innerParams.showConfirmButton || innerParams.showDenyButton || innerParams.showCancelButton || innerParams.showCloseButton);
      };
      var ignoreOutsideClick = false;

      /**
       * @param {DomCache} domCache
       */
      var handleModalMousedown = function handleModalMousedown(domCache) {
        domCache.popup.onmousedown = function () {
          domCache.container.onmouseup = function (e) {
            domCache.container.onmouseup = function () {};
            // We only check if the mouseup target is the container because usually it doesn't
            // have any other direct children aside of the popup
            if (e.target === domCache.container) {
              ignoreOutsideClick = true;
            }
          };
        };
      };

      /**
       * @param {DomCache} domCache
       */
      var handleContainerMousedown = function handleContainerMousedown(domCache) {
        domCache.container.onmousedown = function (e) {
          // prevent the modal text from being selected on double click on the container (allowOutsideClick: false)
          if (e.target === domCache.container) {
            e.preventDefault();
          }
          domCache.popup.onmouseup = function (e) {
            domCache.popup.onmouseup = function () {};
            // We also need to check if the mouseup target is a child of the popup
            if (e.target === domCache.popup || e.target instanceof HTMLElement && domCache.popup.contains(e.target)) {
              ignoreOutsideClick = true;
            }
          };
        };
      };

      /**
       * @param {SweetAlertOptions} innerParams
       * @param {DomCache} domCache
       * @param {Function} dismissWith
       */
      var handleModalClick = function handleModalClick(innerParams, domCache, dismissWith) {
        domCache.container.onclick = function (e) {
          if (ignoreOutsideClick) {
            ignoreOutsideClick = false;
            return;
          }
          if (e.target === domCache.container && callIfFunction(innerParams.allowOutsideClick)) {
            dismissWith(DismissReason.backdrop);
          }
        };
      };

      var isJqueryElement = function isJqueryElement(elem) {
        return _typeof(elem) === 'object' && elem.jquery;
      };
      var isElement = function isElement(elem) {
        return elem instanceof Element || isJqueryElement(elem);
      };
      var argsToParams = function argsToParams(args) {
        var params = {};
        if (_typeof(args[0]) === 'object' && !isElement(args[0])) {
          Object.assign(params, args[0]);
        } else {
          ['title', 'html', 'icon'].forEach(function (name, index) {
            var arg = args[index];
            if (typeof arg === 'string' || isElement(arg)) {
              params[name] = arg;
            } else if (arg !== undefined) {
              error("Unexpected type of ".concat(name, "! Expected \"string\" or \"Element\", got ").concat(_typeof(arg)));
            }
          });
        }
        return params;
      };

      /**
       * Main method to create a new SweetAlert2 popup
       *
       * @param  {...SweetAlertOptions} args
       * @returns {Promise<SweetAlertResult>}
       */
      function fire() {
        var Swal = this; // eslint-disable-line @typescript-eslint/no-this-alias
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        return _construct(Swal, args);
      }

      /**
       * Returns an extended version of `Swal` containing `params` as defaults.
       * Useful for reusing Swal configuration.
       *
       * For example:
       *
       * Before:
       * const textPromptOptions = { input: 'text', showCancelButton: true }
       * const {value: firstName} = await Swal.fire({ ...textPromptOptions, title: 'What is your first name?' })
       * const {value: lastName} = await Swal.fire({ ...textPromptOptions, title: 'What is your last name?' })
       *
       * After:
       * const TextPrompt = Swal.mixin({ input: 'text', showCancelButton: true })
       * const {value: firstName} = await TextPrompt('What is your first name?')
       * const {value: lastName} = await TextPrompt('What is your last name?')
       *
       * @param {SweetAlertOptions} mixinParams
       * @returns {SweetAlert}
       */
      function mixin(mixinParams) {
        var MixinSwal = /*#__PURE__*/function (_this) {
          function MixinSwal() {
            _classCallCheck(this, MixinSwal);
            return _callSuper(this, MixinSwal, arguments);
          }
          _inherits(MixinSwal, _this);
          return _createClass(MixinSwal, [{
            key: "_main",
            value: function _main(params, priorityMixinParams) {
              return _get(_getPrototypeOf(MixinSwal.prototype), "_main", this).call(this, params, Object.assign({}, mixinParams, priorityMixinParams));
            }
          }]);
        }(this); // @ts-ignore
        return MixinSwal;
      }

      /**
       * If `timer` parameter is set, returns number of milliseconds of timer remained.
       * Otherwise, returns undefined.
       *
       * @returns {number | undefined}
       */
      var getTimerLeft = function getTimerLeft() {
        return globalState.timeout && globalState.timeout.getTimerLeft();
      };

      /**
       * Stop timer. Returns number of milliseconds of timer remained.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @returns {number | undefined}
       */
      var stopTimer = function stopTimer() {
        if (globalState.timeout) {
          stopTimerProgressBar();
          return globalState.timeout.stop();
        }
      };

      /**
       * Resume timer. Returns number of milliseconds of timer remained.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @returns {number | undefined}
       */
      var resumeTimer = function resumeTimer() {
        if (globalState.timeout) {
          var remaining = globalState.timeout.start();
          animateTimerProgressBar(remaining);
          return remaining;
        }
      };

      /**
       * Resume timer. Returns number of milliseconds of timer remained.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @returns {number | undefined}
       */
      var toggleTimer = function toggleTimer() {
        var timer = globalState.timeout;
        return timer && (timer.running ? stopTimer() : resumeTimer());
      };

      /**
       * Increase timer. Returns number of milliseconds of an updated timer.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @param {number} ms
       * @returns {number | undefined}
       */
      var increaseTimer = function increaseTimer(ms) {
        if (globalState.timeout) {
          var remaining = globalState.timeout.increase(ms);
          animateTimerProgressBar(remaining, true);
          return remaining;
        }
      };

      /**
       * Check if timer is running. Returns true if timer is running
       * or false if timer is paused or stopped.
       * If `timer` parameter isn't set, returns undefined
       *
       * @returns {boolean}
       */
      var isTimerRunning = function isTimerRunning() {
        return !!(globalState.timeout && globalState.timeout.isRunning());
      };

      var bodyClickListenerAdded = false;
      var clickHandlers = {};

      /**
       * @param {string} attr
       */
      function bindClickHandler() {
        var attr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'data-swal-template';
        clickHandlers[attr] = this;
        if (!bodyClickListenerAdded) {
          document.body.addEventListener('click', bodyClickListener);
          bodyClickListenerAdded = true;
        }
      }
      var bodyClickListener = function bodyClickListener(event) {
        for (var el = event.target; el && el !== document; el = el.parentNode) {
          for (var attr in clickHandlers) {
            var template = el.getAttribute(attr);
            if (template) {
              clickHandlers[attr].fire({
                template: template
              });
              return;
            }
          }
        }
      };

      var staticMethods = /*#__PURE__*/Object.freeze({
        __proto__: null,
        argsToParams: argsToParams,
        bindClickHandler: bindClickHandler,
        clickCancel: clickCancel,
        clickConfirm: clickConfirm,
        clickDeny: clickDeny,
        enableLoading: showLoading,
        fire: fire,
        getActions: getActions,
        getCancelButton: getCancelButton,
        getCloseButton: getCloseButton,
        getConfirmButton: getConfirmButton,
        getContainer: getContainer,
        getDenyButton: getDenyButton,
        getFocusableElements: getFocusableElements,
        getFooter: getFooter,
        getHtmlContainer: getHtmlContainer,
        getIcon: getIcon,
        getIconContent: getIconContent,
        getImage: getImage,
        getInputLabel: getInputLabel,
        getLoader: getLoader,
        getPopup: getPopup,
        getProgressSteps: getProgressSteps,
        getTimerLeft: getTimerLeft,
        getTimerProgressBar: getTimerProgressBar,
        getTitle: getTitle,
        getValidationMessage: getValidationMessage,
        increaseTimer: increaseTimer,
        isDeprecatedParameter: isDeprecatedParameter,
        isLoading: isLoading,
        isTimerRunning: isTimerRunning,
        isUpdatableParameter: isUpdatableParameter,
        isValidParameter: isValidParameter,
        isVisible: isVisible,
        mixin: mixin,
        resumeTimer: resumeTimer,
        showLoading: showLoading,
        stopTimer: stopTimer,
        toggleTimer: toggleTimer
      });

      var Timer = /*#__PURE__*/function () {
        /**
         * @param {Function} callback
         * @param {number} delay
         */
        function Timer(callback, delay) {
          _classCallCheck(this, Timer);
          this.callback = callback;
          this.remaining = delay;
          this.running = false;
          this.start();
        }

        /**
         * @returns {number}
         */
        return _createClass(Timer, [{
          key: "start",
          value: function start() {
            if (!this.running) {
              this.running = true;
              this.started = new Date();
              this.id = setTimeout(this.callback, this.remaining);
            }
            return this.remaining;
          }

          /**
           * @returns {number}
           */
        }, {
          key: "stop",
          value: function stop() {
            if (this.started && this.running) {
              this.running = false;
              clearTimeout(this.id);
              this.remaining -= new Date().getTime() - this.started.getTime();
            }
            return this.remaining;
          }

          /**
           * @param {number} n
           * @returns {number}
           */
        }, {
          key: "increase",
          value: function increase(n) {
            var running = this.running;
            if (running) {
              this.stop();
            }
            this.remaining += n;
            if (running) {
              this.start();
            }
            return this.remaining;
          }

          /**
           * @returns {number}
           */
        }, {
          key: "getTimerLeft",
          value: function getTimerLeft() {
            if (this.running) {
              this.stop();
              this.start();
            }
            return this.remaining;
          }

          /**
           * @returns {boolean}
           */
        }, {
          key: "isRunning",
          value: function isRunning() {
            return this.running;
          }
        }]);
      }();

      var swalStringParams = ['swal-title', 'swal-html', 'swal-footer'];

      /**
       * @param {SweetAlertOptions} params
       * @returns {SweetAlertOptions}
       */
      var getTemplateParams = function getTemplateParams(params) {
        /** @type {HTMLTemplateElement} */
        var template = typeof params.template === 'string' ? document.querySelector(params.template) : params.template;
        if (!template) {
          return {};
        }
        /** @type {DocumentFragment} */
        var templateContent = template.content;
        showWarningsForElements(templateContent);
        var result = Object.assign(getSwalParams(templateContent), getSwalFunctionParams(templateContent), getSwalButtons(templateContent), getSwalImage(templateContent), getSwalIcon(templateContent), getSwalInput(templateContent), getSwalStringParams(templateContent, swalStringParams));
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      var getSwalParams = function getSwalParams(templateContent) {
        var result = {};
        /** @type {HTMLElement[]} */
        var swalParams = Array.from(templateContent.querySelectorAll('swal-param'));
        swalParams.forEach(function (param) {
          showWarningsForAttributes(param, ['name', 'value']);
          var paramName = param.getAttribute('name');
          var value = param.getAttribute('value');
          if (typeof defaultParams[paramName] === 'boolean') {
            result[paramName] = value !== 'false';
          } else if (_typeof(defaultParams[paramName]) === 'object') {
            result[paramName] = JSON.parse(value);
          } else {
            result[paramName] = value;
          }
        });
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      var getSwalFunctionParams = function getSwalFunctionParams(templateContent) {
        var result = {};
        /** @type {HTMLElement[]} */
        var swalFunctions = Array.from(templateContent.querySelectorAll('swal-function-param'));
        swalFunctions.forEach(function (param) {
          var paramName = param.getAttribute('name');
          var value = param.getAttribute('value');
          result[paramName] = new Function("return ".concat(value))();
        });
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      var getSwalButtons = function getSwalButtons(templateContent) {
        var result = {};
        /** @type {HTMLElement[]} */
        var swalButtons = Array.from(templateContent.querySelectorAll('swal-button'));
        swalButtons.forEach(function (button) {
          showWarningsForAttributes(button, ['type', 'color', 'aria-label']);
          var type = button.getAttribute('type');
          result["".concat(type, "ButtonText")] = button.innerHTML;
          result["show".concat(capitalizeFirstLetter(type), "Button")] = true;
          if (button.hasAttribute('color')) {
            result["".concat(type, "ButtonColor")] = button.getAttribute('color');
          }
          if (button.hasAttribute('aria-label')) {
            result["".concat(type, "ButtonAriaLabel")] = button.getAttribute('aria-label');
          }
        });
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      var getSwalImage = function getSwalImage(templateContent) {
        var result = {};
        /** @type {HTMLElement} */
        var image = templateContent.querySelector('swal-image');
        if (image) {
          showWarningsForAttributes(image, ['src', 'width', 'height', 'alt']);
          if (image.hasAttribute('src')) {
            result.imageUrl = image.getAttribute('src');
          }
          if (image.hasAttribute('width')) {
            result.imageWidth = image.getAttribute('width');
          }
          if (image.hasAttribute('height')) {
            result.imageHeight = image.getAttribute('height');
          }
          if (image.hasAttribute('alt')) {
            result.imageAlt = image.getAttribute('alt');
          }
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      var getSwalIcon = function getSwalIcon(templateContent) {
        var result = {};
        /** @type {HTMLElement} */
        var icon = templateContent.querySelector('swal-icon');
        if (icon) {
          showWarningsForAttributes(icon, ['type', 'color']);
          if (icon.hasAttribute('type')) {
            /** @type {SweetAlertIcon} */
            // @ts-ignore
            result.icon = icon.getAttribute('type');
          }
          if (icon.hasAttribute('color')) {
            result.iconColor = icon.getAttribute('color');
          }
          result.iconHtml = icon.innerHTML;
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      var getSwalInput = function getSwalInput(templateContent) {
        var result = {};
        /** @type {HTMLElement} */
        var input = templateContent.querySelector('swal-input');
        if (input) {
          showWarningsForAttributes(input, ['type', 'label', 'placeholder', 'value']);
          /** @type {SweetAlertInput} */
          // @ts-ignore
          result.input = input.getAttribute('type') || 'text';
          if (input.hasAttribute('label')) {
            result.inputLabel = input.getAttribute('label');
          }
          if (input.hasAttribute('placeholder')) {
            result.inputPlaceholder = input.getAttribute('placeholder');
          }
          if (input.hasAttribute('value')) {
            result.inputValue = input.getAttribute('value');
          }
        }
        /** @type {HTMLElement[]} */
        var inputOptions = Array.from(templateContent.querySelectorAll('swal-input-option'));
        if (inputOptions.length) {
          result.inputOptions = {};
          inputOptions.forEach(function (option) {
            showWarningsForAttributes(option, ['value']);
            var optionValue = option.getAttribute('value');
            var optionName = option.innerHTML;
            result.inputOptions[optionValue] = optionName;
          });
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @param {string[]} paramNames
       * @returns {SweetAlertOptions}
       */
      var getSwalStringParams = function getSwalStringParams(templateContent, paramNames) {
        var result = {};
        for (var i in paramNames) {
          var paramName = paramNames[i];
          /** @type {HTMLElement} */
          var tag = templateContent.querySelector(paramName);
          if (tag) {
            showWarningsForAttributes(tag, []);
            result[paramName.replace(/^swal-/, '')] = tag.innerHTML.trim();
          }
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       */
      var showWarningsForElements = function showWarningsForElements(templateContent) {
        var allowedElements = swalStringParams.concat(['swal-param', 'swal-function-param', 'swal-button', 'swal-image', 'swal-icon', 'swal-input', 'swal-input-option']);
        Array.from(templateContent.children).forEach(function (el) {
          var tagName = el.tagName.toLowerCase();
          if (!allowedElements.includes(tagName)) {
            warn("Unrecognized element <".concat(tagName, ">"));
          }
        });
      };

      /**
       * @param {HTMLElement} el
       * @param {string[]} allowedAttributes
       */
      var showWarningsForAttributes = function showWarningsForAttributes(el, allowedAttributes) {
        Array.from(el.attributes).forEach(function (attribute) {
          if (allowedAttributes.indexOf(attribute.name) === -1) {
            warn(["Unrecognized attribute \"".concat(attribute.name, "\" on <").concat(el.tagName.toLowerCase(), ">."), "".concat(allowedAttributes.length ? "Allowed attributes are: ".concat(allowedAttributes.join(', ')) : 'To set the value, use HTML within the element.')]);
          }
        });
      };

      var SHOW_CLASS_TIMEOUT = 10;

      /**
       * Open popup, add necessary classes and styles, fix scrollbar
       *
       * @param {SweetAlertOptions} params
       */
      var openPopup = function openPopup(params) {
        var container = getContainer();
        var popup = getPopup();
        if (typeof params.willOpen === 'function') {
          params.willOpen(popup);
        }
        var bodyStyles = window.getComputedStyle(document.body);
        var initialBodyOverflow = bodyStyles.overflowY;
        addClasses(container, popup, params);

        // scrolling is 'hidden' until animation is done, after that 'auto'
        setTimeout(function () {
          setScrollingVisibility(container, popup);
        }, SHOW_CLASS_TIMEOUT);
        if (isModal()) {
          fixScrollContainer(container, params.scrollbarPadding, initialBodyOverflow);
          setAriaHidden();
        }
        if (!isToast() && !globalState.previousActiveElement) {
          globalState.previousActiveElement = document.activeElement;
        }
        if (typeof params.didOpen === 'function') {
          setTimeout(function () {
            return params.didOpen(popup);
          });
        }
        removeClass(container, swalClasses['no-transition']);
      };

      /**
       * @param {AnimationEvent} event
       */
      var swalOpenAnimationFinished = function swalOpenAnimationFinished(event) {
        var popup = getPopup();
        if (event.target !== popup || !animationEndEvent) {
          return;
        }
        var container = getContainer();
        popup.removeEventListener(animationEndEvent, swalOpenAnimationFinished);
        container.style.overflowY = 'auto';
      };

      /**
       * @param {HTMLElement} container
       * @param {HTMLElement} popup
       */
      var setScrollingVisibility = function setScrollingVisibility(container, popup) {
        if (animationEndEvent && hasCssAnimation(popup)) {
          container.style.overflowY = 'hidden';
          popup.addEventListener(animationEndEvent, swalOpenAnimationFinished);
        } else {
          container.style.overflowY = 'auto';
        }
      };

      /**
       * @param {HTMLElement} container
       * @param {boolean} scrollbarPadding
       * @param {string} initialBodyOverflow
       */
      var fixScrollContainer = function fixScrollContainer(container, scrollbarPadding, initialBodyOverflow) {
        iOSfix();
        if (scrollbarPadding && initialBodyOverflow !== 'hidden') {
          replaceScrollbarWithPadding(initialBodyOverflow);
        }

        // sweetalert2/issues/1247
        setTimeout(function () {
          container.scrollTop = 0;
        });
      };

      /**
       * @param {HTMLElement} container
       * @param {HTMLElement} popup
       * @param {SweetAlertOptions} params
       */
      var addClasses = function addClasses(container, popup, params) {
        addClass(container, params.showClass.backdrop);
        if (params.animation) {
          // this workaround with opacity is needed for https://github.com/sweetalert2/sweetalert2/issues/2059
          popup.style.setProperty('opacity', '0', 'important');
          show(popup, 'grid');
          setTimeout(function () {
            // Animate popup right after showing it
            addClass(popup, params.showClass.popup);
            // and remove the opacity workaround
            popup.style.removeProperty('opacity');
          }, SHOW_CLASS_TIMEOUT); // 10ms in order to fix #2062
        } else {
          show(popup, 'grid');
        }
        addClass([document.documentElement, document.body], swalClasses.shown);
        if (params.heightAuto && params.backdrop && !params.toast) {
          addClass([document.documentElement, document.body], swalClasses['height-auto']);
        }
      };

      var defaultInputValidators = {
        /**
         * @param {string} string
         * @param {string} [validationMessage]
         * @returns {Promise<string | void>}
         */
        email: function email(string, validationMessage) {
          return /^[a-zA-Z0-9.+_'-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]+$/.test(string) ? Promise.resolve() : Promise.resolve(validationMessage || 'Invalid email address');
        },
        /**
         * @param {string} string
         * @param {string} [validationMessage]
         * @returns {Promise<string | void>}
         */
        url: function url(string, validationMessage) {
          // taken from https://stackoverflow.com/a/3809435 with a small change from #1306 and #2013
          return /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)$/.test(string) ? Promise.resolve() : Promise.resolve(validationMessage || 'Invalid URL');
        }
      };

      /**
       * @param {SweetAlertOptions} params
       */
      function setDefaultInputValidators(params) {
        // Use default `inputValidator` for supported input types if not provided
        if (params.inputValidator) {
          return;
        }
        if (params.input === 'email') {
          params.inputValidator = defaultInputValidators['email'];
        }
        if (params.input === 'url') {
          params.inputValidator = defaultInputValidators['url'];
        }
      }

      /**
       * @param {SweetAlertOptions} params
       */
      function validateCustomTargetElement(params) {
        // Determine if the custom target element is valid
        if (!params.target || typeof params.target === 'string' && !document.querySelector(params.target) || typeof params.target !== 'string' && !params.target.appendChild) {
          warn('Target parameter is not valid, defaulting to "body"');
          params.target = 'body';
        }
      }

      /**
       * Set type, text and actions on popup
       *
       * @param {SweetAlertOptions} params
       */
      function setParameters(params) {
        setDefaultInputValidators(params);

        // showLoaderOnConfirm && preConfirm
        if (params.showLoaderOnConfirm && !params.preConfirm) {
          warn('showLoaderOnConfirm is set to true, but preConfirm is not defined.\n' + 'showLoaderOnConfirm should be used together with preConfirm, see usage example:\n' + 'https://sweetalert2.github.io/#ajax-request');
        }
        validateCustomTargetElement(params);

        // Replace newlines with <br> in title
        if (typeof params.title === 'string') {
          params.title = params.title.split('\n').join('<br />');
        }
        init(params);
      }

      /** @type {SweetAlert} */
      var currentInstance;
      var _promise = /*#__PURE__*/new WeakMap();
      var SweetAlert = /*#__PURE__*/function () {
        /**
         * @param {...any} args
         * @this {SweetAlert}
         */
        function SweetAlert() {
          _classCallCheck(this, SweetAlert);
          /**
           * @type {Promise<SweetAlertResult>}
           */
          _classPrivateFieldInitSpec(this, _promise, void 0);
          // Prevent run in Node env
          if (typeof window === 'undefined') {
            return;
          }
          currentInstance = this;

          // @ts-ignore
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          var outerParams = Object.freeze(this.constructor.argsToParams(args));

          /** @type {Readonly<SweetAlertOptions>} */
          this.params = outerParams;

          /** @type {boolean} */
          this.isAwaitingPromise = false;
          _classPrivateFieldSet2(_promise, this, this._main(currentInstance.params));
        }
        return _createClass(SweetAlert, [{
          key: "_main",
          value: function _main(userParams) {
            var mixinParams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            showWarningsForParams(Object.assign({}, mixinParams, userParams));
            if (globalState.currentInstance) {
              var swalPromiseResolve = privateMethods.swalPromiseResolve.get(globalState.currentInstance);
              var isAwaitingPromise = globalState.currentInstance.isAwaitingPromise;
              globalState.currentInstance._destroy();
              if (!isAwaitingPromise) {
                swalPromiseResolve({
                  isDismissed: true
                });
              }
              if (isModal()) {
                unsetAriaHidden();
              }
            }
            globalState.currentInstance = currentInstance;
            var innerParams = prepareParams(userParams, mixinParams);
            setParameters(innerParams);
            Object.freeze(innerParams);

            // clear the previous timer
            if (globalState.timeout) {
              globalState.timeout.stop();
              delete globalState.timeout;
            }

            // clear the restore focus timeout
            clearTimeout(globalState.restoreFocusTimeout);
            var domCache = populateDomCache(currentInstance);
            render(currentInstance, innerParams);
            privateProps.innerParams.set(currentInstance, innerParams);
            return swalPromise(currentInstance, domCache, innerParams);
          }

          // `catch` cannot be the name of a module export, so we define our thenable methods here instead
        }, {
          key: "then",
          value: function then(onFulfilled) {
            return _classPrivateFieldGet2(_promise, this).then(onFulfilled);
          }
        }, {
          key: "finally",
          value: function _finally(onFinally) {
            return _classPrivateFieldGet2(_promise, this)["finally"](onFinally);
          }
        }]);
      }();

      /**
       * @param {SweetAlert} instance
       * @param {DomCache} domCache
       * @param {SweetAlertOptions} innerParams
       * @returns {Promise}
       */
      var swalPromise = function swalPromise(instance, domCache, innerParams) {
        return new Promise(function (resolve, reject) {
          // functions to handle all closings/dismissals
          /**
           * @param {DismissReason} dismiss
           */
          var dismissWith = function dismissWith(dismiss) {
            instance.close({
              isDismissed: true,
              dismiss: dismiss
            });
          };
          privateMethods.swalPromiseResolve.set(instance, resolve);
          privateMethods.swalPromiseReject.set(instance, reject);
          domCache.confirmButton.onclick = function () {
            handleConfirmButtonClick(instance);
          };
          domCache.denyButton.onclick = function () {
            handleDenyButtonClick(instance);
          };
          domCache.cancelButton.onclick = function () {
            handleCancelButtonClick(instance, dismissWith);
          };
          domCache.closeButton.onclick = function () {
            dismissWith(DismissReason.close);
          };
          handlePopupClick(innerParams, domCache, dismissWith);
          addKeydownHandler(globalState, innerParams, dismissWith);
          handleInputOptionsAndValue(instance, innerParams);
          openPopup(innerParams);
          setupTimer(globalState, innerParams, dismissWith);
          initFocus(domCache, innerParams);

          // Scroll container to top on open (#1247, #1946)
          setTimeout(function () {
            domCache.container.scrollTop = 0;
          });
        });
      };

      /**
       * @param {SweetAlertOptions} userParams
       * @param {SweetAlertOptions} mixinParams
       * @returns {SweetAlertOptions}
       */
      var prepareParams = function prepareParams(userParams, mixinParams) {
        var templateParams = getTemplateParams(userParams);
        var params = Object.assign({}, defaultParams, mixinParams, templateParams, userParams); // precedence is described in #2131
        params.showClass = Object.assign({}, defaultParams.showClass, params.showClass);
        params.hideClass = Object.assign({}, defaultParams.hideClass, params.hideClass);
        if (params.animation === false) {
          params.showClass = {
            backdrop: 'swal2-noanimation'
          };
          params.hideClass = {};
        }
        return params;
      };

      /**
       * @param {SweetAlert} instance
       * @returns {DomCache}
       */
      var populateDomCache = function populateDomCache(instance) {
        var domCache = {
          popup: getPopup(),
          container: getContainer(),
          actions: getActions(),
          confirmButton: getConfirmButton(),
          denyButton: getDenyButton(),
          cancelButton: getCancelButton(),
          loader: getLoader(),
          closeButton: getCloseButton(),
          validationMessage: getValidationMessage(),
          progressSteps: getProgressSteps()
        };
        privateProps.domCache.set(instance, domCache);
        return domCache;
      };

      /**
       * @param {GlobalState} globalState
       * @param {SweetAlertOptions} innerParams
       * @param {Function} dismissWith
       */
      var setupTimer = function setupTimer(globalState, innerParams, dismissWith) {
        var timerProgressBar = getTimerProgressBar();
        hide(timerProgressBar);
        if (innerParams.timer) {
          globalState.timeout = new Timer(function () {
            dismissWith('timer');
            delete globalState.timeout;
          }, innerParams.timer);
          if (innerParams.timerProgressBar) {
            show(timerProgressBar);
            applyCustomClass(timerProgressBar, innerParams, 'timerProgressBar');
            setTimeout(function () {
              if (globalState.timeout && globalState.timeout.running) {
                // timer can be already stopped or unset at this point
                animateTimerProgressBar(innerParams.timer);
              }
            });
          }
        }
      };

      /**
       * @param {DomCache} domCache
       * @param {SweetAlertOptions} innerParams
       */
      var initFocus = function initFocus(domCache, innerParams) {
        if (innerParams.toast) {
          return;
        }
        if (!callIfFunction(innerParams.allowEnterKey)) {
          blurActiveElement();
          return;
        }
        if (!focusButton(domCache, innerParams)) {
          setFocus(-1, 1);
        }
      };

      /**
       * @param {DomCache} domCache
       * @param {SweetAlertOptions} innerParams
       * @returns {boolean}
       */
      var focusButton = function focusButton(domCache, innerParams) {
        if (innerParams.focusDeny && isVisible$1(domCache.denyButton)) {
          domCache.denyButton.focus();
          return true;
        }
        if (innerParams.focusCancel && isVisible$1(domCache.cancelButton)) {
          domCache.cancelButton.focus();
          return true;
        }
        if (innerParams.focusConfirm && isVisible$1(domCache.confirmButton)) {
          domCache.confirmButton.focus();
          return true;
        }
        return false;
      };
      var blurActiveElement = function blurActiveElement() {
        if (document.activeElement instanceof HTMLElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
      };

      // Dear russian users visiting russian sites. Let's have fun.
      if (typeof window !== 'undefined' && /^ru\b/.test(navigator.language) && location.host.match(/\.(ru|su|by|xn--p1ai)$/)) {
        var now = new Date();
        var initiationDate = localStorage.getItem('swal-initiation');
        if (!initiationDate) {
          localStorage.setItem('swal-initiation', "".concat(now));
        } else if ((now.getTime() - Date.parse(initiationDate)) / (1000 * 60 * 60 * 24) > 3) {
          setTimeout(function () {
            document.body.style.pointerEvents = 'none';
            var ukrainianAnthem = document.createElement('audio');
            ukrainianAnthem.src = 'https://flag-gimn.ru/wp-content/uploads/2021/09/Ukraina.mp3';
            ukrainianAnthem.loop = true;
            document.body.appendChild(ukrainianAnthem);
            setTimeout(function () {
              ukrainianAnthem.play()["catch"](function () {
                // ignore
              });
            }, 2500);
          }, 500);
        }
      }

      // Assign instance methods from src/instanceMethods/*.js to prototype
      SweetAlert.prototype.disableButtons = disableButtons;
      SweetAlert.prototype.enableButtons = enableButtons;
      SweetAlert.prototype.getInput = getInput;
      SweetAlert.prototype.disableInput = disableInput;
      SweetAlert.prototype.enableInput = enableInput;
      SweetAlert.prototype.hideLoading = hideLoading;
      SweetAlert.prototype.disableLoading = hideLoading;
      SweetAlert.prototype.showValidationMessage = showValidationMessage;
      SweetAlert.prototype.resetValidationMessage = resetValidationMessage;
      SweetAlert.prototype.close = close;
      SweetAlert.prototype.closePopup = close;
      SweetAlert.prototype.closeModal = close;
      SweetAlert.prototype.closeToast = close;
      SweetAlert.prototype.rejectPromise = rejectPromise;
      SweetAlert.prototype.update = update;
      SweetAlert.prototype._destroy = _destroy;

      // Assign static methods from src/staticMethods/*.js to constructor
      Object.assign(SweetAlert, staticMethods);

      // Proxy to instance methods to constructor, for now, for backwards compatibility
      Object.keys(instanceMethods).forEach(function (key) {
        /**
         * @param {...any} args
         * @returns {any | undefined}
         */
        SweetAlert[key] = function () {
          if (currentInstance && currentInstance[key]) {
            var _currentInstance;
            return (_currentInstance = currentInstance)[key].apply(_currentInstance, arguments);
          }
          return null;
        };
      });
      SweetAlert.DismissReason = DismissReason;
      SweetAlert.version = '11.10.8';

      var Swal = SweetAlert;
      // @ts-ignore
      Swal["default"] = Swal;

      return Swal;

    }));
    if (typeof commonjsGlobal !== 'undefined' && commonjsGlobal.Sweetalert2){commonjsGlobal.swal = commonjsGlobal.sweetAlert = commonjsGlobal.Swal = commonjsGlobal.SweetAlert = commonjsGlobal.Sweetalert2;}
    "undefined"!=typeof document&&function(e,t){var n=e.createElement("style");if(e.getElementsByTagName("head")[0].appendChild(n),n.styleSheet)n.styleSheet.disabled||(n.styleSheet.cssText=t);else try{n.innerHTML=t;}catch(e){n.innerText=t;}}(document,".swal2-popup.swal2-toast{box-sizing:border-box;grid-column:1/4 !important;grid-row:1/4 !important;grid-template-columns:min-content auto min-content;padding:1em;overflow-y:hidden;background:#fff;box-shadow:0 0 1px rgba(0,0,0,.075),0 1px 2px rgba(0,0,0,.075),1px 2px 4px rgba(0,0,0,.075),1px 3px 8px rgba(0,0,0,.075),2px 4px 16px rgba(0,0,0,.075);pointer-events:all}.swal2-popup.swal2-toast>*{grid-column:2}.swal2-popup.swal2-toast .swal2-title{margin:.5em 1em;padding:0;font-size:1em;text-align:initial}.swal2-popup.swal2-toast .swal2-loading{justify-content:center}.swal2-popup.swal2-toast .swal2-input{height:2em;margin:.5em;font-size:1em}.swal2-popup.swal2-toast .swal2-validation-message{font-size:1em}.swal2-popup.swal2-toast .swal2-footer{margin:.5em 0 0;padding:.5em 0 0;font-size:.8em}.swal2-popup.swal2-toast .swal2-close{grid-column:3/3;grid-row:1/99;align-self:center;width:.8em;height:.8em;margin:0;font-size:2em}.swal2-popup.swal2-toast .swal2-html-container{margin:.5em 1em;padding:0;overflow:initial;font-size:1em;text-align:initial}.swal2-popup.swal2-toast .swal2-html-container:empty{padding:0}.swal2-popup.swal2-toast .swal2-loader{grid-column:1;grid-row:1/99;align-self:center;width:2em;height:2em;margin:.25em}.swal2-popup.swal2-toast .swal2-icon{grid-column:1;grid-row:1/99;align-self:center;width:2em;min-width:2em;height:2em;margin:0 .5em 0 0}.swal2-popup.swal2-toast .swal2-icon .swal2-icon-content{display:flex;align-items:center;font-size:1.8em;font-weight:bold}.swal2-popup.swal2-toast .swal2-icon.swal2-success .swal2-success-ring{width:2em;height:2em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line]{top:.875em;width:1.375em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=left]{left:.3125em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=right]{right:.3125em}.swal2-popup.swal2-toast .swal2-actions{justify-content:flex-start;height:auto;margin:0;margin-top:.5em;padding:0 .5em}.swal2-popup.swal2-toast .swal2-styled{margin:.25em .5em;padding:.4em .6em;font-size:1em}.swal2-popup.swal2-toast .swal2-success{border-color:#a5dc86}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line]{position:absolute;width:1.6em;height:3em;border-radius:50%}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line][class$=left]{top:-0.8em;left:-0.5em;transform:rotate(-45deg);transform-origin:2em 2em;border-radius:4em 0 0 4em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line][class$=right]{top:-0.25em;left:.9375em;transform-origin:0 1.5em;border-radius:0 4em 4em 0}.swal2-popup.swal2-toast .swal2-success .swal2-success-ring{width:2em;height:2em}.swal2-popup.swal2-toast .swal2-success .swal2-success-fix{top:0;left:.4375em;width:.4375em;height:2.6875em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line]{height:.3125em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line][class$=tip]{top:1.125em;left:.1875em;width:.75em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line][class$=long]{top:.9375em;right:.1875em;width:1.375em}.swal2-popup.swal2-toast .swal2-success.swal2-icon-show .swal2-success-line-tip{animation:swal2-toast-animate-success-line-tip .75s}.swal2-popup.swal2-toast .swal2-success.swal2-icon-show .swal2-success-line-long{animation:swal2-toast-animate-success-line-long .75s}.swal2-popup.swal2-toast.swal2-show{animation:swal2-toast-show .5s}.swal2-popup.swal2-toast.swal2-hide{animation:swal2-toast-hide .1s forwards}div:where(.swal2-container){display:grid;position:fixed;z-index:1060;inset:0;box-sizing:border-box;grid-template-areas:\"top-start     top            top-end\" \"center-start  center         center-end\" \"bottom-start  bottom-center  bottom-end\";grid-template-rows:minmax(min-content, auto) minmax(min-content, auto) minmax(min-content, auto);height:100%;padding:.625em;overflow-x:hidden;transition:background-color .1s;-webkit-overflow-scrolling:touch}div:where(.swal2-container).swal2-backdrop-show,div:where(.swal2-container).swal2-noanimation{background:rgba(0,0,0,.4)}div:where(.swal2-container).swal2-backdrop-hide{background:rgba(0,0,0,0) !important}div:where(.swal2-container).swal2-top-start,div:where(.swal2-container).swal2-center-start,div:where(.swal2-container).swal2-bottom-start{grid-template-columns:minmax(0, 1fr) auto auto}div:where(.swal2-container).swal2-top,div:where(.swal2-container).swal2-center,div:where(.swal2-container).swal2-bottom{grid-template-columns:auto minmax(0, 1fr) auto}div:where(.swal2-container).swal2-top-end,div:where(.swal2-container).swal2-center-end,div:where(.swal2-container).swal2-bottom-end{grid-template-columns:auto auto minmax(0, 1fr)}div:where(.swal2-container).swal2-top-start>.swal2-popup{align-self:start}div:where(.swal2-container).swal2-top>.swal2-popup{grid-column:2;place-self:start center}div:where(.swal2-container).swal2-top-end>.swal2-popup,div:where(.swal2-container).swal2-top-right>.swal2-popup{grid-column:3;place-self:start end}div:where(.swal2-container).swal2-center-start>.swal2-popup,div:where(.swal2-container).swal2-center-left>.swal2-popup{grid-row:2;align-self:center}div:where(.swal2-container).swal2-center>.swal2-popup{grid-column:2;grid-row:2;place-self:center center}div:where(.swal2-container).swal2-center-end>.swal2-popup,div:where(.swal2-container).swal2-center-right>.swal2-popup{grid-column:3;grid-row:2;place-self:center end}div:where(.swal2-container).swal2-bottom-start>.swal2-popup,div:where(.swal2-container).swal2-bottom-left>.swal2-popup{grid-column:1;grid-row:3;align-self:end}div:where(.swal2-container).swal2-bottom>.swal2-popup{grid-column:2;grid-row:3;place-self:end center}div:where(.swal2-container).swal2-bottom-end>.swal2-popup,div:where(.swal2-container).swal2-bottom-right>.swal2-popup{grid-column:3;grid-row:3;place-self:end end}div:where(.swal2-container).swal2-grow-row>.swal2-popup,div:where(.swal2-container).swal2-grow-fullscreen>.swal2-popup{grid-column:1/4;width:100%}div:where(.swal2-container).swal2-grow-column>.swal2-popup,div:where(.swal2-container).swal2-grow-fullscreen>.swal2-popup{grid-row:1/4;align-self:stretch}div:where(.swal2-container).swal2-no-transition{transition:none !important}div:where(.swal2-container) div:where(.swal2-popup){display:none;position:relative;box-sizing:border-box;grid-template-columns:minmax(0, 100%);width:32em;max-width:100%;padding:0 0 1.25em;border:none;border-radius:5px;background:#fff;color:#545454;font-family:inherit;font-size:1rem}div:where(.swal2-container) div:where(.swal2-popup):focus{outline:none}div:where(.swal2-container) div:where(.swal2-popup).swal2-loading{overflow-y:hidden}div:where(.swal2-container) h2:where(.swal2-title){position:relative;max-width:100%;margin:0;padding:.8em 1em 0;color:inherit;font-size:1.875em;font-weight:600;text-align:center;text-transform:none;word-wrap:break-word}div:where(.swal2-container) div:where(.swal2-actions){display:flex;z-index:1;box-sizing:border-box;flex-wrap:wrap;align-items:center;justify-content:center;width:auto;margin:1.25em auto 0;padding:0}div:where(.swal2-container) div:where(.swal2-actions):not(.swal2-loading) .swal2-styled[disabled]{opacity:.4}div:where(.swal2-container) div:where(.swal2-actions):not(.swal2-loading) .swal2-styled:hover{background-image:linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))}div:where(.swal2-container) div:where(.swal2-actions):not(.swal2-loading) .swal2-styled:active{background-image:linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2))}div:where(.swal2-container) div:where(.swal2-loader){display:none;align-items:center;justify-content:center;width:2.2em;height:2.2em;margin:0 1.875em;animation:swal2-rotate-loading 1.5s linear 0s infinite normal;border-width:.25em;border-style:solid;border-radius:100%;border-color:#2778c4 rgba(0,0,0,0) #2778c4 rgba(0,0,0,0)}div:where(.swal2-container) button:where(.swal2-styled){margin:.3125em;padding:.625em 1.1em;transition:box-shadow .1s;box-shadow:0 0 0 3px rgba(0,0,0,0);font-weight:500}div:where(.swal2-container) button:where(.swal2-styled):not([disabled]){cursor:pointer}div:where(.swal2-container) button:where(.swal2-styled).swal2-confirm{border:0;border-radius:.25em;background:initial;background-color:#7066e0;color:#fff;font-size:1em}div:where(.swal2-container) button:where(.swal2-styled).swal2-confirm:focus{box-shadow:0 0 0 3px rgba(112,102,224,.5)}div:where(.swal2-container) button:where(.swal2-styled).swal2-deny{border:0;border-radius:.25em;background:initial;background-color:#dc3741;color:#fff;font-size:1em}div:where(.swal2-container) button:where(.swal2-styled).swal2-deny:focus{box-shadow:0 0 0 3px rgba(220,55,65,.5)}div:where(.swal2-container) button:where(.swal2-styled).swal2-cancel{border:0;border-radius:.25em;background:initial;background-color:#6e7881;color:#fff;font-size:1em}div:where(.swal2-container) button:where(.swal2-styled).swal2-cancel:focus{box-shadow:0 0 0 3px rgba(110,120,129,.5)}div:where(.swal2-container) button:where(.swal2-styled).swal2-default-outline:focus{box-shadow:0 0 0 3px rgba(100,150,200,.5)}div:where(.swal2-container) button:where(.swal2-styled):focus{outline:none}div:where(.swal2-container) button:where(.swal2-styled)::-moz-focus-inner{border:0}div:where(.swal2-container) div:where(.swal2-footer){margin:1em 0 0;padding:1em 1em 0;border-top:1px solid #eee;color:inherit;font-size:1em;text-align:center}div:where(.swal2-container) .swal2-timer-progress-bar-container{position:absolute;right:0;bottom:0;left:0;grid-column:auto !important;overflow:hidden;border-bottom-right-radius:5px;border-bottom-left-radius:5px}div:where(.swal2-container) div:where(.swal2-timer-progress-bar){width:100%;height:.25em;background:rgba(0,0,0,.2)}div:where(.swal2-container) img:where(.swal2-image){max-width:100%;margin:2em auto 1em}div:where(.swal2-container) button:where(.swal2-close){z-index:2;align-items:center;justify-content:center;width:1.2em;height:1.2em;margin-top:0;margin-right:0;margin-bottom:-1.2em;padding:0;overflow:hidden;transition:color .1s,box-shadow .1s;border:none;border-radius:5px;background:rgba(0,0,0,0);color:#ccc;font-family:monospace;font-size:2.5em;cursor:pointer;justify-self:end}div:where(.swal2-container) button:where(.swal2-close):hover{transform:none;background:rgba(0,0,0,0);color:#f27474}div:where(.swal2-container) button:where(.swal2-close):focus{outline:none;box-shadow:inset 0 0 0 3px rgba(100,150,200,.5)}div:where(.swal2-container) button:where(.swal2-close)::-moz-focus-inner{border:0}div:where(.swal2-container) .swal2-html-container{z-index:1;justify-content:center;margin:1em 1.6em .3em;padding:0;overflow:auto;color:inherit;font-size:1.125em;font-weight:normal;line-height:normal;text-align:center;word-wrap:break-word;word-break:break-word}div:where(.swal2-container) input:where(.swal2-input),div:where(.swal2-container) input:where(.swal2-file),div:where(.swal2-container) textarea:where(.swal2-textarea),div:where(.swal2-container) select:where(.swal2-select),div:where(.swal2-container) div:where(.swal2-radio),div:where(.swal2-container) label:where(.swal2-checkbox){margin:1em 2em 3px}div:where(.swal2-container) input:where(.swal2-input),div:where(.swal2-container) input:where(.swal2-file),div:where(.swal2-container) textarea:where(.swal2-textarea){box-sizing:border-box;width:auto;transition:border-color .1s,box-shadow .1s;border:1px solid #d9d9d9;border-radius:.1875em;background:rgba(0,0,0,0);box-shadow:inset 0 1px 1px rgba(0,0,0,.06),0 0 0 3px rgba(0,0,0,0);color:inherit;font-size:1.125em}div:where(.swal2-container) input:where(.swal2-input).swal2-inputerror,div:where(.swal2-container) input:where(.swal2-file).swal2-inputerror,div:where(.swal2-container) textarea:where(.swal2-textarea).swal2-inputerror{border-color:#f27474 !important;box-shadow:0 0 2px #f27474 !important}div:where(.swal2-container) input:where(.swal2-input):focus,div:where(.swal2-container) input:where(.swal2-file):focus,div:where(.swal2-container) textarea:where(.swal2-textarea):focus{border:1px solid #b4dbed;outline:none;box-shadow:inset 0 1px 1px rgba(0,0,0,.06),0 0 0 3px rgba(100,150,200,.5)}div:where(.swal2-container) input:where(.swal2-input)::placeholder,div:where(.swal2-container) input:where(.swal2-file)::placeholder,div:where(.swal2-container) textarea:where(.swal2-textarea)::placeholder{color:#ccc}div:where(.swal2-container) .swal2-range{margin:1em 2em 3px;background:#fff}div:where(.swal2-container) .swal2-range input{width:80%}div:where(.swal2-container) .swal2-range output{width:20%;color:inherit;font-weight:600;text-align:center}div:where(.swal2-container) .swal2-range input,div:where(.swal2-container) .swal2-range output{height:2.625em;padding:0;font-size:1.125em;line-height:2.625em}div:where(.swal2-container) .swal2-input{height:2.625em;padding:0 .75em}div:where(.swal2-container) .swal2-file{width:75%;margin-right:auto;margin-left:auto;background:rgba(0,0,0,0);font-size:1.125em}div:where(.swal2-container) .swal2-textarea{height:6.75em;padding:.75em}div:where(.swal2-container) .swal2-select{min-width:50%;max-width:100%;padding:.375em .625em;background:rgba(0,0,0,0);color:inherit;font-size:1.125em}div:where(.swal2-container) .swal2-radio,div:where(.swal2-container) .swal2-checkbox{align-items:center;justify-content:center;background:#fff;color:inherit}div:where(.swal2-container) .swal2-radio label,div:where(.swal2-container) .swal2-checkbox label{margin:0 .6em;font-size:1.125em}div:where(.swal2-container) .swal2-radio input,div:where(.swal2-container) .swal2-checkbox input{flex-shrink:0;margin:0 .4em}div:where(.swal2-container) label:where(.swal2-input-label){display:flex;justify-content:center;margin:1em auto 0}div:where(.swal2-container) div:where(.swal2-validation-message){align-items:center;justify-content:center;margin:1em 0 0;padding:.625em;overflow:hidden;background:#f0f0f0;color:#666;font-size:1em;font-weight:300}div:where(.swal2-container) div:where(.swal2-validation-message)::before{content:\"!\";display:inline-block;width:1.5em;min-width:1.5em;height:1.5em;margin:0 .625em;border-radius:50%;background-color:#f27474;color:#fff;font-weight:600;line-height:1.5em;text-align:center}div:where(.swal2-container) .swal2-progress-steps{flex-wrap:wrap;align-items:center;max-width:100%;margin:1.25em auto;padding:0;background:rgba(0,0,0,0);font-weight:600}div:where(.swal2-container) .swal2-progress-steps li{display:inline-block;position:relative}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step{z-index:20;flex-shrink:0;width:2em;height:2em;border-radius:2em;background:#2778c4;color:#fff;line-height:2em;text-align:center}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step.swal2-active-progress-step{background:#2778c4}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step.swal2-active-progress-step~.swal2-progress-step{background:#add8e6;color:#fff}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step.swal2-active-progress-step~.swal2-progress-step-line{background:#add8e6}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step-line{z-index:10;flex-shrink:0;width:2.5em;height:.4em;margin:0 -1px;background:#2778c4}div:where(.swal2-icon){position:relative;box-sizing:content-box;justify-content:center;width:5em;height:5em;margin:2.5em auto .6em;border:0.25em solid rgba(0,0,0,0);border-radius:50%;border-color:#000;font-family:inherit;line-height:5em;cursor:default;user-select:none}div:where(.swal2-icon) .swal2-icon-content{display:flex;align-items:center;font-size:3.75em}div:where(.swal2-icon).swal2-error{border-color:#f27474;color:#f27474}div:where(.swal2-icon).swal2-error .swal2-x-mark{position:relative;flex-grow:1}div:where(.swal2-icon).swal2-error [class^=swal2-x-mark-line]{display:block;position:absolute;top:2.3125em;width:2.9375em;height:.3125em;border-radius:.125em;background-color:#f27474}div:where(.swal2-icon).swal2-error [class^=swal2-x-mark-line][class$=left]{left:1.0625em;transform:rotate(45deg)}div:where(.swal2-icon).swal2-error [class^=swal2-x-mark-line][class$=right]{right:1em;transform:rotate(-45deg)}div:where(.swal2-icon).swal2-error.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-error.swal2-icon-show .swal2-x-mark{animation:swal2-animate-error-x-mark .5s}div:where(.swal2-icon).swal2-warning{border-color:#facea8;color:#f8bb86}div:where(.swal2-icon).swal2-warning.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-warning.swal2-icon-show .swal2-icon-content{animation:swal2-animate-i-mark .5s}div:where(.swal2-icon).swal2-info{border-color:#9de0f6;color:#3fc3ee}div:where(.swal2-icon).swal2-info.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-info.swal2-icon-show .swal2-icon-content{animation:swal2-animate-i-mark .8s}div:where(.swal2-icon).swal2-question{border-color:#c9dae1;color:#87adbd}div:where(.swal2-icon).swal2-question.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-question.swal2-icon-show .swal2-icon-content{animation:swal2-animate-question-mark .8s}div:where(.swal2-icon).swal2-success{border-color:#a5dc86;color:#a5dc86}div:where(.swal2-icon).swal2-success [class^=swal2-success-circular-line]{position:absolute;width:3.75em;height:7.5em;border-radius:50%}div:where(.swal2-icon).swal2-success [class^=swal2-success-circular-line][class$=left]{top:-0.4375em;left:-2.0635em;transform:rotate(-45deg);transform-origin:3.75em 3.75em;border-radius:7.5em 0 0 7.5em}div:where(.swal2-icon).swal2-success [class^=swal2-success-circular-line][class$=right]{top:-0.6875em;left:1.875em;transform:rotate(-45deg);transform-origin:0 3.75em;border-radius:0 7.5em 7.5em 0}div:where(.swal2-icon).swal2-success .swal2-success-ring{position:absolute;z-index:2;top:-0.25em;left:-0.25em;box-sizing:content-box;width:100%;height:100%;border:.25em solid rgba(165,220,134,.3);border-radius:50%}div:where(.swal2-icon).swal2-success .swal2-success-fix{position:absolute;z-index:1;top:.5em;left:1.625em;width:.4375em;height:5.625em;transform:rotate(-45deg)}div:where(.swal2-icon).swal2-success [class^=swal2-success-line]{display:block;position:absolute;z-index:2;height:.3125em;border-radius:.125em;background-color:#a5dc86}div:where(.swal2-icon).swal2-success [class^=swal2-success-line][class$=tip]{top:2.875em;left:.8125em;width:1.5625em;transform:rotate(45deg)}div:where(.swal2-icon).swal2-success [class^=swal2-success-line][class$=long]{top:2.375em;right:.5em;width:2.9375em;transform:rotate(-45deg)}div:where(.swal2-icon).swal2-success.swal2-icon-show .swal2-success-line-tip{animation:swal2-animate-success-line-tip .75s}div:where(.swal2-icon).swal2-success.swal2-icon-show .swal2-success-line-long{animation:swal2-animate-success-line-long .75s}div:where(.swal2-icon).swal2-success.swal2-icon-show .swal2-success-circular-line-right{animation:swal2-rotate-success-circular-line 4.25s ease-in}[class^=swal2]{-webkit-tap-highlight-color:rgba(0,0,0,0)}.swal2-show{animation:swal2-show .3s}.swal2-hide{animation:swal2-hide .15s forwards}.swal2-noanimation{transition:none}.swal2-scrollbar-measure{position:absolute;top:-9999px;width:50px;height:50px;overflow:scroll}.swal2-rtl .swal2-close{margin-right:initial;margin-left:0}.swal2-rtl .swal2-timer-progress-bar{right:0;left:auto}@keyframes swal2-toast-show{0%{transform:translateY(-0.625em) rotateZ(2deg)}33%{transform:translateY(0) rotateZ(-2deg)}66%{transform:translateY(0.3125em) rotateZ(2deg)}100%{transform:translateY(0) rotateZ(0deg)}}@keyframes swal2-toast-hide{100%{transform:rotateZ(1deg);opacity:0}}@keyframes swal2-toast-animate-success-line-tip{0%{top:.5625em;left:.0625em;width:0}54%{top:.125em;left:.125em;width:0}70%{top:.625em;left:-0.25em;width:1.625em}84%{top:1.0625em;left:.75em;width:.5em}100%{top:1.125em;left:.1875em;width:.75em}}@keyframes swal2-toast-animate-success-line-long{0%{top:1.625em;right:1.375em;width:0}65%{top:1.25em;right:.9375em;width:0}84%{top:.9375em;right:0;width:1.125em}100%{top:.9375em;right:.1875em;width:1.375em}}@keyframes swal2-show{0%{transform:scale(0.7)}45%{transform:scale(1.05)}80%{transform:scale(0.95)}100%{transform:scale(1)}}@keyframes swal2-hide{0%{transform:scale(1);opacity:1}100%{transform:scale(0.5);opacity:0}}@keyframes swal2-animate-success-line-tip{0%{top:1.1875em;left:.0625em;width:0}54%{top:1.0625em;left:.125em;width:0}70%{top:2.1875em;left:-0.375em;width:3.125em}84%{top:3em;left:1.3125em;width:1.0625em}100%{top:2.8125em;left:.8125em;width:1.5625em}}@keyframes swal2-animate-success-line-long{0%{top:3.375em;right:2.875em;width:0}65%{top:3.375em;right:2.875em;width:0}84%{top:2.1875em;right:0;width:3.4375em}100%{top:2.375em;right:.5em;width:2.9375em}}@keyframes swal2-rotate-success-circular-line{0%{transform:rotate(-45deg)}5%{transform:rotate(-45deg)}12%{transform:rotate(-405deg)}100%{transform:rotate(-405deg)}}@keyframes swal2-animate-error-x-mark{0%{margin-top:1.625em;transform:scale(0.4);opacity:0}50%{margin-top:1.625em;transform:scale(0.4);opacity:0}80%{margin-top:-0.375em;transform:scale(1.15)}100%{margin-top:0;transform:scale(1);opacity:1}}@keyframes swal2-animate-error-icon{0%{transform:rotateX(100deg);opacity:0}100%{transform:rotateX(0deg);opacity:1}}@keyframes swal2-rotate-loading{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes swal2-animate-question-mark{0%{transform:rotateY(-360deg)}100%{transform:rotateY(0)}}@keyframes swal2-animate-i-mark{0%{transform:rotateZ(45deg);opacity:0}25%{transform:rotateZ(-25deg);opacity:.4}50%{transform:rotateZ(15deg);opacity:.8}75%{transform:rotateZ(-5deg);opacity:1}100%{transform:rotateX(0);opacity:1}}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown){overflow:hidden}body.swal2-height-auto{height:auto !important}body.swal2-no-backdrop .swal2-container{background-color:rgba(0,0,0,0) !important;pointer-events:none}body.swal2-no-backdrop .swal2-container .swal2-popup{pointer-events:all}body.swal2-no-backdrop .swal2-container .swal2-modal{box-shadow:0 0 10px rgba(0,0,0,.4)}@media print{body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown){overflow-y:scroll !important}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown)>[aria-hidden=true]{display:none}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown) .swal2-container{position:static !important}}body.swal2-toast-shown .swal2-container{box-sizing:border-box;width:360px;max-width:100%;background-color:rgba(0,0,0,0);pointer-events:none}body.swal2-toast-shown .swal2-container.swal2-top{inset:0 auto auto 50%;transform:translateX(-50%)}body.swal2-toast-shown .swal2-container.swal2-top-end,body.swal2-toast-shown .swal2-container.swal2-top-right{inset:0 0 auto auto}body.swal2-toast-shown .swal2-container.swal2-top-start,body.swal2-toast-shown .swal2-container.swal2-top-left{inset:0 auto auto 0}body.swal2-toast-shown .swal2-container.swal2-center-start,body.swal2-toast-shown .swal2-container.swal2-center-left{inset:50% auto auto 0;transform:translateY(-50%)}body.swal2-toast-shown .swal2-container.swal2-center{inset:50% auto auto 50%;transform:translate(-50%, -50%)}body.swal2-toast-shown .swal2-container.swal2-center-end,body.swal2-toast-shown .swal2-container.swal2-center-right{inset:50% 0 auto auto;transform:translateY(-50%)}body.swal2-toast-shown .swal2-container.swal2-bottom-start,body.swal2-toast-shown .swal2-container.swal2-bottom-left{inset:auto auto 0 0}body.swal2-toast-shown .swal2-container.swal2-bottom{inset:auto auto 0 50%;transform:translateX(-50%)}body.swal2-toast-shown .swal2-container.swal2-bottom-end,body.swal2-toast-shown .swal2-container.swal2-bottom-right{inset:auto 0 0 auto}");
    });

    /* src\components\Dropdowns\TableAddShoppingCart.svelte generated by Svelte v3.35.0 */

    function create_fragment$e(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.innerHTML = `<i class="fas fa-shopping-cart"></i>`;
    			attr(button, "class", "text-blueGray-500 py-1 px-3 rounded-full");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    			/*button_binding*/ ctx[3](button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleEdit*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*button_binding*/ ctx[3](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { product } = $$props;
    	const dispatch = createEventDispatcher();
    	let btnDropdownRef;

    	const handleEdit = () => {
    		dispatch("customEvent", { producto: product });
    	};

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			btnDropdownRef = $$value;
    			$$invalidate(0, btnDropdownRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("product" in $$props) $$invalidate(2, product = $$props.product);
    	};

    	return [btnDropdownRef, handleEdit, product, button_binding];
    }

    class TableAddShoppingCart extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$e, safe_not_equal, { product: 2 });
    	}
    }

    function bind(fn, thisArg) {
      return function wrap() {
        return fn.apply(thisArg, arguments);
      };
    }

    // utils is a library of generic helper functions non-specific to axios

    const {toString} = Object.prototype;
    const {getPrototypeOf} = Object;

    const kindOf = (cache => thing => {
        const str = toString.call(thing);
        return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
    })(Object.create(null));

    const kindOfTest = (type) => {
      type = type.toLowerCase();
      return (thing) => kindOf(thing) === type
    };

    const typeOfTest = type => thing => typeof thing === type;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     *
     * @returns {boolean} True if value is an Array, otherwise false
     */
    const {isArray} = Array;

    /**
     * Determine if a value is undefined
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    const isUndefined = typeOfTest('undefined');

    /**
     * Determine if a value is a Buffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    const isArrayBuffer = kindOfTest('ArrayBuffer');


    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      let result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a String, otherwise false
     */
    const isString = typeOfTest('string');

    /**
     * Determine if a value is a Function
     *
     * @param {*} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    const isFunction = typeOfTest('function');

    /**
     * Determine if a value is a Number
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Number, otherwise false
     */
    const isNumber = typeOfTest('number');

    /**
     * Determine if a value is an Object
     *
     * @param {*} thing The value to test
     *
     * @returns {boolean} True if value is an Object, otherwise false
     */
    const isObject = (thing) => thing !== null && typeof thing === 'object';

    /**
     * Determine if a value is a Boolean
     *
     * @param {*} thing The value to test
     * @returns {boolean} True if value is a Boolean, otherwise false
     */
    const isBoolean = thing => thing === true || thing === false;

    /**
     * Determine if a value is a plain Object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a plain Object, otherwise false
     */
    const isPlainObject = (val) => {
      if (kindOf(val) !== 'object') {
        return false;
      }

      const prototype = getPrototypeOf(val);
      return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
    };

    /**
     * Determine if a value is a Date
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Date, otherwise false
     */
    const isDate = kindOfTest('Date');

    /**
     * Determine if a value is a File
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a File, otherwise false
     */
    const isFile = kindOfTest('File');

    /**
     * Determine if a value is a Blob
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    const isBlob = kindOfTest('Blob');

    /**
     * Determine if a value is a FileList
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a File, otherwise false
     */
    const isFileList = kindOfTest('FileList');

    /**
     * Determine if a value is a Stream
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    const isStream = (val) => isObject(val) && isFunction(val.pipe);

    /**
     * Determine if a value is a FormData
     *
     * @param {*} thing The value to test
     *
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    const isFormData = (thing) => {
      let kind;
      return thing && (
        (typeof FormData === 'function' && thing instanceof FormData) || (
          isFunction(thing.append) && (
            (kind = kindOf(thing)) === 'formdata' ||
            // detect form-data instance
            (kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]')
          )
        )
      )
    };

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    const isURLSearchParams = kindOfTest('URLSearchParams');

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     *
     * @returns {String} The String freed of excess whitespace
     */
    const trim = (str) => str.trim ?
      str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     *
     * @param {Boolean} [allOwnKeys = false]
     * @returns {any}
     */
    function forEach(obj, fn, {allOwnKeys = false} = {}) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      let i;
      let l;

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
        const len = keys.length;
        let key;

        for (i = 0; i < len; i++) {
          key = keys[i];
          fn.call(null, obj[key], key, obj);
        }
      }
    }

    function findKey(obj, key) {
      key = key.toLowerCase();
      const keys = Object.keys(obj);
      let i = keys.length;
      let _key;
      while (i-- > 0) {
        _key = keys[i];
        if (key === _key.toLowerCase()) {
          return _key;
        }
      }
      return null;
    }

    const _global = (() => {
      /*eslint no-undef:0*/
      if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : global)
    })();

    const isContextDefined = (context) => !isUndefined(context) && context !== _global;

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     *
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      const {caseless} = isContextDefined(this) && this || {};
      const result = {};
      const assignValue = (val, key) => {
        const targetKey = caseless && findKey(result, key) || key;
        if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
          result[targetKey] = merge(result[targetKey], val);
        } else if (isPlainObject(val)) {
          result[targetKey] = merge({}, val);
        } else if (isArray(val)) {
          result[targetKey] = val.slice();
        } else {
          result[targetKey] = val;
        }
      };

      for (let i = 0, l = arguments.length; i < l; i++) {
        arguments[i] && forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     *
     * @param {Boolean} [allOwnKeys]
     * @returns {Object} The resulting value of object a
     */
    const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
      forEach(b, (val, key) => {
        if (thisArg && isFunction(val)) {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      }, {allOwnKeys});
      return a;
    };

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     *
     * @returns {string} content value without BOM
     */
    const stripBOM = (content) => {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    };

    /**
     * Inherit the prototype methods from one constructor into another
     * @param {function} constructor
     * @param {function} superConstructor
     * @param {object} [props]
     * @param {object} [descriptors]
     *
     * @returns {void}
     */
    const inherits = (constructor, superConstructor, props, descriptors) => {
      constructor.prototype = Object.create(superConstructor.prototype, descriptors);
      constructor.prototype.constructor = constructor;
      Object.defineProperty(constructor, 'super', {
        value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
    };

    /**
     * Resolve object with deep prototype chain to a flat object
     * @param {Object} sourceObj source object
     * @param {Object} [destObj]
     * @param {Function|Boolean} [filter]
     * @param {Function} [propFilter]
     *
     * @returns {Object}
     */
    const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
      let props;
      let i;
      let prop;
      const merged = {};

      destObj = destObj || {};
      // eslint-disable-next-line no-eq-null,eqeqeq
      if (sourceObj == null) return destObj;

      do {
        props = Object.getOwnPropertyNames(sourceObj);
        i = props.length;
        while (i-- > 0) {
          prop = props[i];
          if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
            destObj[prop] = sourceObj[prop];
            merged[prop] = true;
          }
        }
        sourceObj = filter !== false && getPrototypeOf(sourceObj);
      } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

      return destObj;
    };

    /**
     * Determines whether a string ends with the characters of a specified string
     *
     * @param {String} str
     * @param {String} searchString
     * @param {Number} [position= 0]
     *
     * @returns {boolean}
     */
    const endsWith = (str, searchString, position) => {
      str = String(str);
      if (position === undefined || position > str.length) {
        position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    };


    /**
     * Returns new array from array like object or null if failed
     *
     * @param {*} [thing]
     *
     * @returns {?Array}
     */
    const toArray = (thing) => {
      if (!thing) return null;
      if (isArray(thing)) return thing;
      let i = thing.length;
      if (!isNumber(i)) return null;
      const arr = new Array(i);
      while (i-- > 0) {
        arr[i] = thing[i];
      }
      return arr;
    };

    /**
     * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
     * thing passed in is an instance of Uint8Array
     *
     * @param {TypedArray}
     *
     * @returns {Array}
     */
    // eslint-disable-next-line func-names
    const isTypedArray = (TypedArray => {
      // eslint-disable-next-line func-names
      return thing => {
        return TypedArray && thing instanceof TypedArray;
      };
    })(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

    /**
     * For each entry in the object, call the function with the key and value.
     *
     * @param {Object<any, any>} obj - The object to iterate over.
     * @param {Function} fn - The function to call for each entry.
     *
     * @returns {void}
     */
    const forEachEntry = (obj, fn) => {
      const generator = obj && obj[Symbol.iterator];

      const iterator = generator.call(obj);

      let result;

      while ((result = iterator.next()) && !result.done) {
        const pair = result.value;
        fn.call(obj, pair[0], pair[1]);
      }
    };

    /**
     * It takes a regular expression and a string, and returns an array of all the matches
     *
     * @param {string} regExp - The regular expression to match against.
     * @param {string} str - The string to search.
     *
     * @returns {Array<boolean>}
     */
    const matchAll = (regExp, str) => {
      let matches;
      const arr = [];

      while ((matches = regExp.exec(str)) !== null) {
        arr.push(matches);
      }

      return arr;
    };

    /* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
    const isHTMLForm = kindOfTest('HTMLFormElement');

    const toCamelCase = str => {
      return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,
        function replacer(m, p1, p2) {
          return p1.toUpperCase() + p2;
        }
      );
    };

    /* Creating a function that will check if an object has a property. */
    const hasOwnProperty = (({hasOwnProperty}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

    /**
     * Determine if a value is a RegExp object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a RegExp object, otherwise false
     */
    const isRegExp = kindOfTest('RegExp');

    const reduceDescriptors = (obj, reducer) => {
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};

      forEach(descriptors, (descriptor, name) => {
        let ret;
        if ((ret = reducer(descriptor, name, obj)) !== false) {
          reducedDescriptors[name] = ret || descriptor;
        }
      });

      Object.defineProperties(obj, reducedDescriptors);
    };

    /**
     * Makes all methods read-only
     * @param {Object} obj
     */

    const freezeMethods = (obj) => {
      reduceDescriptors(obj, (descriptor, name) => {
        // skip restricted props in strict mode
        if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
          return false;
        }

        const value = obj[name];

        if (!isFunction(value)) return;

        descriptor.enumerable = false;

        if ('writable' in descriptor) {
          descriptor.writable = false;
          return;
        }

        if (!descriptor.set) {
          descriptor.set = () => {
            throw Error('Can not rewrite read-only method \'' + name + '\'');
          };
        }
      });
    };

    const toObjectSet = (arrayOrString, delimiter) => {
      const obj = {};

      const define = (arr) => {
        arr.forEach(value => {
          obj[value] = true;
        });
      };

      isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

      return obj;
    };

    const noop = () => {};

    const toFiniteNumber = (value, defaultValue) => {
      value = +value;
      return Number.isFinite(value) ? value : defaultValue;
    };

    const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

    const DIGIT = '0123456789';

    const ALPHABET = {
      DIGIT,
      ALPHA,
      ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
    };

    const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
      let str = '';
      const {length} = alphabet;
      while (size--) {
        str += alphabet[Math.random() * length|0];
      }

      return str;
    };

    /**
     * If the thing is a FormData object, return true, otherwise return false.
     *
     * @param {unknown} thing - The thing to check.
     *
     * @returns {boolean}
     */
    function isSpecCompliantForm(thing) {
      return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
    }

    const toJSONObject = (obj) => {
      const stack = new Array(10);

      const visit = (source, i) => {

        if (isObject(source)) {
          if (stack.indexOf(source) >= 0) {
            return;
          }

          if(!('toJSON' in source)) {
            stack[i] = source;
            const target = isArray(source) ? [] : {};

            forEach(source, (value, key) => {
              const reducedValue = visit(value, i + 1);
              !isUndefined(reducedValue) && (target[key] = reducedValue);
            });

            stack[i] = undefined;

            return target;
          }
        }

        return source;
      };

      return visit(obj, 0);
    };

    const isAsyncFn = kindOfTest('AsyncFunction');

    const isThenable = (thing) =>
      thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);

    var utils$1 = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData,
      isArrayBufferView,
      isString,
      isNumber,
      isBoolean,
      isObject,
      isPlainObject,
      isUndefined,
      isDate,
      isFile,
      isBlob,
      isRegExp,
      isFunction,
      isStream,
      isURLSearchParams,
      isTypedArray,
      isFileList,
      forEach,
      merge,
      extend,
      trim,
      stripBOM,
      inherits,
      toFlatObject,
      kindOf,
      kindOfTest,
      endsWith,
      toArray,
      forEachEntry,
      matchAll,
      isHTMLForm,
      hasOwnProperty,
      hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
      reduceDescriptors,
      freezeMethods,
      toObjectSet,
      toCamelCase,
      noop,
      toFiniteNumber,
      findKey,
      global: _global,
      isContextDefined,
      ALPHABET,
      generateString,
      isSpecCompliantForm,
      toJSONObject,
      isAsyncFn,
      isThenable
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [config] The config.
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     *
     * @returns {Error} The created error.
     */
    function AxiosError(message, code, config, request, response) {
      Error.call(this);

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = (new Error()).stack;
      }

      this.message = message;
      this.name = 'AxiosError';
      code && (this.code = code);
      config && (this.config = config);
      request && (this.request = request);
      response && (this.response = response);
    }

    utils$1.inherits(AxiosError, Error, {
      toJSON: function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: utils$1.toJSONObject(this.config),
          code: this.code,
          status: this.response && this.response.status ? this.response.status : null
        };
      }
    });

    const prototype$1 = AxiosError.prototype;
    const descriptors = {};

    [
      'ERR_BAD_OPTION_VALUE',
      'ERR_BAD_OPTION',
      'ECONNABORTED',
      'ETIMEDOUT',
      'ERR_NETWORK',
      'ERR_FR_TOO_MANY_REDIRECTS',
      'ERR_DEPRECATED',
      'ERR_BAD_RESPONSE',
      'ERR_BAD_REQUEST',
      'ERR_CANCELED',
      'ERR_NOT_SUPPORT',
      'ERR_INVALID_URL'
    // eslint-disable-next-line func-names
    ].forEach(code => {
      descriptors[code] = {value: code};
    });

    Object.defineProperties(AxiosError, descriptors);
    Object.defineProperty(prototype$1, 'isAxiosError', {value: true});

    // eslint-disable-next-line func-names
    AxiosError.from = (error, code, config, request, response, customProps) => {
      const axiosError = Object.create(prototype$1);

      utils$1.toFlatObject(error, axiosError, function filter(obj) {
        return obj !== Error.prototype;
      }, prop => {
        return prop !== 'isAxiosError';
      });

      AxiosError.call(axiosError, error.message, code, config, request, response);

      axiosError.cause = error;

      axiosError.name = error.name;

      customProps && Object.assign(axiosError, customProps);

      return axiosError;
    };

    // eslint-disable-next-line strict
    var httpAdapter = null;

    /**
     * Determines if the given thing is a array or js object.
     *
     * @param {string} thing - The object or array to be visited.
     *
     * @returns {boolean}
     */
    function isVisitable(thing) {
      return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
    }

    /**
     * It removes the brackets from the end of a string
     *
     * @param {string} key - The key of the parameter.
     *
     * @returns {string} the key without the brackets.
     */
    function removeBrackets(key) {
      return utils$1.endsWith(key, '[]') ? key.slice(0, -2) : key;
    }

    /**
     * It takes a path, a key, and a boolean, and returns a string
     *
     * @param {string} path - The path to the current key.
     * @param {string} key - The key of the current object being iterated over.
     * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
     *
     * @returns {string} The path to the current key.
     */
    function renderKey(path, key, dots) {
      if (!path) return key;
      return path.concat(key).map(function each(token, i) {
        // eslint-disable-next-line no-param-reassign
        token = removeBrackets(token);
        return !dots && i ? '[' + token + ']' : token;
      }).join(dots ? '.' : '');
    }

    /**
     * If the array is an array and none of its elements are visitable, then it's a flat array.
     *
     * @param {Array<any>} arr - The array to check
     *
     * @returns {boolean}
     */
    function isFlatArray(arr) {
      return utils$1.isArray(arr) && !arr.some(isVisitable);
    }

    const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
      return /^is[A-Z]/.test(prop);
    });

    /**
     * Convert a data object to FormData
     *
     * @param {Object} obj
     * @param {?Object} [formData]
     * @param {?Object} [options]
     * @param {Function} [options.visitor]
     * @param {Boolean} [options.metaTokens = true]
     * @param {Boolean} [options.dots = false]
     * @param {?Boolean} [options.indexes = false]
     *
     * @returns {Object}
     **/

    /**
     * It converts an object into a FormData object
     *
     * @param {Object<any, any>} obj - The object to convert to form data.
     * @param {string} formData - The FormData object to append to.
     * @param {Object<string, any>} options
     *
     * @returns
     */
    function toFormData(obj, formData, options) {
      if (!utils$1.isObject(obj)) {
        throw new TypeError('target must be an object');
      }

      // eslint-disable-next-line no-param-reassign
      formData = formData || new (FormData)();

      // eslint-disable-next-line no-param-reassign
      options = utils$1.toFlatObject(options, {
        metaTokens: true,
        dots: false,
        indexes: false
      }, false, function defined(option, source) {
        // eslint-disable-next-line no-eq-null,eqeqeq
        return !utils$1.isUndefined(source[option]);
      });

      const metaTokens = options.metaTokens;
      // eslint-disable-next-line no-use-before-define
      const visitor = options.visitor || defaultVisitor;
      const dots = options.dots;
      const indexes = options.indexes;
      const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
      const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);

      if (!utils$1.isFunction(visitor)) {
        throw new TypeError('visitor must be a function');
      }

      function convertValue(value) {
        if (value === null) return '';

        if (utils$1.isDate(value)) {
          return value.toISOString();
        }

        if (!useBlob && utils$1.isBlob(value)) {
          throw new AxiosError('Blob is not supported. Use a Buffer instead.');
        }

        if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
          return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
        }

        return value;
      }

      /**
       * Default visitor.
       *
       * @param {*} value
       * @param {String|Number} key
       * @param {Array<String|Number>} path
       * @this {FormData}
       *
       * @returns {boolean} return true to visit the each prop of the value recursively
       */
      function defaultVisitor(value, key, path) {
        let arr = value;

        if (value && !path && typeof value === 'object') {
          if (utils$1.endsWith(key, '{}')) {
            // eslint-disable-next-line no-param-reassign
            key = metaTokens ? key : key.slice(0, -2);
            // eslint-disable-next-line no-param-reassign
            value = JSON.stringify(value);
          } else if (
            (utils$1.isArray(value) && isFlatArray(value)) ||
            ((utils$1.isFileList(value) || utils$1.endsWith(key, '[]')) && (arr = utils$1.toArray(value))
            )) {
            // eslint-disable-next-line no-param-reassign
            key = removeBrackets(key);

            arr.forEach(function each(el, index) {
              !(utils$1.isUndefined(el) || el === null) && formData.append(
                // eslint-disable-next-line no-nested-ternary
                indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
                convertValue(el)
              );
            });
            return false;
          }
        }

        if (isVisitable(value)) {
          return true;
        }

        formData.append(renderKey(path, key, dots), convertValue(value));

        return false;
      }

      const stack = [];

      const exposedHelpers = Object.assign(predicates, {
        defaultVisitor,
        convertValue,
        isVisitable
      });

      function build(value, path) {
        if (utils$1.isUndefined(value)) return;

        if (stack.indexOf(value) !== -1) {
          throw Error('Circular reference detected in ' + path.join('.'));
        }

        stack.push(value);

        utils$1.forEach(value, function each(el, key) {
          const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
            formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers
          );

          if (result === true) {
            build(el, path ? path.concat(key) : [key]);
          }
        });

        stack.pop();
      }

      if (!utils$1.isObject(obj)) {
        throw new TypeError('data must be an object');
      }

      build(obj);

      return formData;
    }

    /**
     * It encodes a string by replacing all characters that are not in the unreserved set with
     * their percent-encoded equivalents
     *
     * @param {string} str - The string to encode.
     *
     * @returns {string} The encoded string.
     */
    function encode$1(str) {
      const charMap = {
        '!': '%21',
        "'": '%27',
        '(': '%28',
        ')': '%29',
        '~': '%7E',
        '%20': '+',
        '%00': '\x00'
      };
      return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
        return charMap[match];
      });
    }

    /**
     * It takes a params object and converts it to a FormData object
     *
     * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
     * @param {Object<string, any>} options - The options object passed to the Axios constructor.
     *
     * @returns {void}
     */
    function AxiosURLSearchParams(params, options) {
      this._pairs = [];

      params && toFormData(params, this, options);
    }

    const prototype = AxiosURLSearchParams.prototype;

    prototype.append = function append(name, value) {
      this._pairs.push([name, value]);
    };

    prototype.toString = function toString(encoder) {
      const _encode = encoder ? function(value) {
        return encoder.call(this, value, encode$1);
      } : encode$1;

      return this._pairs.map(function each(pair) {
        return _encode(pair[0]) + '=' + _encode(pair[1]);
      }, '').join('&');
    };

    /**
     * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
     * URI encoded counterparts
     *
     * @param {string} val The value to be encoded.
     *
     * @returns {string} The encoded value.
     */
    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @param {?object} options
     *
     * @returns {string} The formatted url
     */
    function buildURL(url, params, options) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }
      
      const _encode = options && options.encode || encode;

      const serializeFn = options && options.serialize;

      let serializedParams;

      if (serializeFn) {
        serializedParams = serializeFn(params, options);
      } else {
        serializedParams = utils$1.isURLSearchParams(params) ?
          params.toString() :
          new AxiosURLSearchParams(params, options).toString(_encode);
      }

      if (serializedParams) {
        const hashmarkIndex = url.indexOf("#");

        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }
        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    }

    class InterceptorManager {
      constructor() {
        this.handlers = [];
      }

      /**
       * Add a new interceptor to the stack
       *
       * @param {Function} fulfilled The function to handle `then` for a `Promise`
       * @param {Function} rejected The function to handle `reject` for a `Promise`
       *
       * @return {Number} An ID used to remove interceptor later
       */
      use(fulfilled, rejected, options) {
        this.handlers.push({
          fulfilled,
          rejected,
          synchronous: options ? options.synchronous : false,
          runWhen: options ? options.runWhen : null
        });
        return this.handlers.length - 1;
      }

      /**
       * Remove an interceptor from the stack
       *
       * @param {Number} id The ID that was returned by `use`
       *
       * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
       */
      eject(id) {
        if (this.handlers[id]) {
          this.handlers[id] = null;
        }
      }

      /**
       * Clear all interceptors from the stack
       *
       * @returns {void}
       */
      clear() {
        if (this.handlers) {
          this.handlers = [];
        }
      }

      /**
       * Iterate over all the registered interceptors
       *
       * This method is particularly useful for skipping over any
       * interceptors that may have become `null` calling `eject`.
       *
       * @param {Function} fn The function to call for each interceptor
       *
       * @returns {void}
       */
      forEach(fn) {
        utils$1.forEach(this.handlers, function forEachHandler(h) {
          if (h !== null) {
            fn(h);
          }
        });
      }
    }

    var transitionalDefaults = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    };

    var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

    var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

    var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

    var platform$1 = {
      isBrowser: true,
      classes: {
        URLSearchParams: URLSearchParams$1,
        FormData: FormData$1,
        Blob: Blob$1
      },
      protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
    };

    const hasBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     *
     * @returns {boolean}
     */
    const hasStandardBrowserEnv = (
      (product) => {
        return hasBrowserEnv && ['ReactNative', 'NativeScript', 'NS'].indexOf(product) < 0
      })(typeof navigator !== 'undefined' && navigator.product);

    /**
     * Determine if we're running in a standard browser webWorker environment
     *
     * Although the `isStandardBrowserEnv` method indicates that
     * `allows axios to run in a web worker`, the WebWorker will still be
     * filtered out due to its judgment standard
     * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
     * This leads to a problem when axios post `FormData` in webWorker
     */
    const hasStandardBrowserWebWorkerEnv = (() => {
      return (
        typeof WorkerGlobalScope !== 'undefined' &&
        // eslint-disable-next-line no-undef
        self instanceof WorkerGlobalScope &&
        typeof self.importScripts === 'function'
      );
    })();

    var utils = /*#__PURE__*/Object.freeze({
        __proto__: null,
        hasBrowserEnv: hasBrowserEnv,
        hasStandardBrowserWebWorkerEnv: hasStandardBrowserWebWorkerEnv,
        hasStandardBrowserEnv: hasStandardBrowserEnv
    });

    var platform = {
      ...utils,
      ...platform$1
    };

    function toURLEncodedForm(data, options) {
      return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
        visitor: function(value, key, path, helpers) {
          if (platform.isNode && utils$1.isBuffer(value)) {
            this.append(key, value.toString('base64'));
            return false;
          }

          return helpers.defaultVisitor.apply(this, arguments);
        }
      }, options));
    }

    /**
     * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
     *
     * @param {string} name - The name of the property to get.
     *
     * @returns An array of strings.
     */
    function parsePropPath(name) {
      // foo[x][y][z]
      // foo.x.y.z
      // foo-x-y-z
      // foo x y z
      return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
        return match[0] === '[]' ? '' : match[1] || match[0];
      });
    }

    /**
     * Convert an array to an object.
     *
     * @param {Array<any>} arr - The array to convert to an object.
     *
     * @returns An object with the same keys and values as the array.
     */
    function arrayToObject(arr) {
      const obj = {};
      const keys = Object.keys(arr);
      let i;
      const len = keys.length;
      let key;
      for (i = 0; i < len; i++) {
        key = keys[i];
        obj[key] = arr[key];
      }
      return obj;
    }

    /**
     * It takes a FormData object and returns a JavaScript object
     *
     * @param {string} formData The FormData object to convert to JSON.
     *
     * @returns {Object<string, any> | null} The converted object.
     */
    function formDataToJSON(formData) {
      function buildPath(path, value, target, index) {
        let name = path[index++];

        if (name === '__proto__') return true;

        const isNumericKey = Number.isFinite(+name);
        const isLast = index >= path.length;
        name = !name && utils$1.isArray(target) ? target.length : name;

        if (isLast) {
          if (utils$1.hasOwnProp(target, name)) {
            target[name] = [target[name], value];
          } else {
            target[name] = value;
          }

          return !isNumericKey;
        }

        if (!target[name] || !utils$1.isObject(target[name])) {
          target[name] = [];
        }

        const result = buildPath(path, value, target[name], index);

        if (result && utils$1.isArray(target[name])) {
          target[name] = arrayToObject(target[name]);
        }

        return !isNumericKey;
      }

      if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
        const obj = {};

        utils$1.forEachEntry(formData, (name, value) => {
          buildPath(parsePropPath(name), value, obj, 0);
        });

        return obj;
      }

      return null;
    }

    /**
     * It takes a string, tries to parse it, and if it fails, it returns the stringified version
     * of the input
     *
     * @param {any} rawValue - The value to be stringified.
     * @param {Function} parser - A function that parses a string into a JavaScript object.
     * @param {Function} encoder - A function that takes a value and returns a string.
     *
     * @returns {string} A stringified version of the rawValue.
     */
    function stringifySafely(rawValue, parser, encoder) {
      if (utils$1.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils$1.trim(rawValue);
        } catch (e) {
          if (e.name !== 'SyntaxError') {
            throw e;
          }
        }
      }

      return (encoder || JSON.stringify)(rawValue);
    }

    const defaults = {

      transitional: transitionalDefaults,

      adapter: ['xhr', 'http'],

      transformRequest: [function transformRequest(data, headers) {
        const contentType = headers.getContentType() || '';
        const hasJSONContentType = contentType.indexOf('application/json') > -1;
        const isObjectPayload = utils$1.isObject(data);

        if (isObjectPayload && utils$1.isHTMLForm(data)) {
          data = new FormData(data);
        }

        const isFormData = utils$1.isFormData(data);

        if (isFormData) {
          return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
        }

        if (utils$1.isArrayBuffer(data) ||
          utils$1.isBuffer(data) ||
          utils$1.isStream(data) ||
          utils$1.isFile(data) ||
          utils$1.isBlob(data)
        ) {
          return data;
        }
        if (utils$1.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils$1.isURLSearchParams(data)) {
          headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
          return data.toString();
        }

        let isFileList;

        if (isObjectPayload) {
          if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }

          if ((isFileList = utils$1.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
            const _FormData = this.env && this.env.FormData;

            return toFormData(
              isFileList ? {'files[]': data} : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }

        if (isObjectPayload || hasJSONContentType ) {
          headers.setContentType('application/json', false);
          return stringifySafely(data);
        }

        return data;
      }],

      transformResponse: [function transformResponse(data) {
        const transitional = this.transitional || defaults.transitional;
        const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        const JSONRequested = this.responseType === 'json';

        if (data && utils$1.isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
          const silentJSONParsing = transitional && transitional.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;

          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === 'SyntaxError') {
                throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
              }
              throw e;
            }
          }
        }

        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      env: {
        FormData: platform.classes.FormData,
        Blob: platform.classes.Blob
      },

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },

      headers: {
        common: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': undefined
        }
      }
    };

    utils$1.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], (method) => {
      defaults.headers[method] = {};
    });

    // RawAxiosHeaders whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    const ignoreDuplicateOf = utils$1.toObjectSet([
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ]);

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} rawHeaders Headers needing to be parsed
     *
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = rawHeaders => {
      const parsed = {};
      let key;
      let val;
      let i;

      rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
        i = line.indexOf(':');
        key = line.substring(0, i).trim().toLowerCase();
        val = line.substring(i + 1).trim();

        if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
          return;
        }

        if (key === 'set-cookie') {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
        }
      });

      return parsed;
    };

    const $internals = Symbol('internals');

    function normalizeHeader(header) {
      return header && String(header).trim().toLowerCase();
    }

    function normalizeValue(value) {
      if (value === false || value == null) {
        return value;
      }

      return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
    }

    function parseTokens(str) {
      const tokens = Object.create(null);
      const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
      let match;

      while ((match = tokensRE.exec(str))) {
        tokens[match[1]] = match[2];
      }

      return tokens;
    }

    const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

    function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
      if (utils$1.isFunction(filter)) {
        return filter.call(this, value, header);
      }

      if (isHeaderNameFilter) {
        value = header;
      }

      if (!utils$1.isString(value)) return;

      if (utils$1.isString(filter)) {
        return value.indexOf(filter) !== -1;
      }

      if (utils$1.isRegExp(filter)) {
        return filter.test(value);
      }
    }

    function formatHeader(header) {
      return header.trim()
        .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
          return char.toUpperCase() + str;
        });
    }

    function buildAccessors(obj, header) {
      const accessorName = utils$1.toCamelCase(' ' + header);

      ['get', 'set', 'has'].forEach(methodName => {
        Object.defineProperty(obj, methodName + accessorName, {
          value: function(arg1, arg2, arg3) {
            return this[methodName].call(this, header, arg1, arg2, arg3);
          },
          configurable: true
        });
      });
    }

    class AxiosHeaders {
      constructor(headers) {
        headers && this.set(headers);
      }

      set(header, valueOrRewrite, rewrite) {
        const self = this;

        function setHeader(_value, _header, _rewrite) {
          const lHeader = normalizeHeader(_header);

          if (!lHeader) {
            throw new Error('header name must be a non-empty string');
          }

          const key = utils$1.findKey(self, lHeader);

          if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
            self[key || _header] = normalizeValue(_value);
          }
        }

        const setHeaders = (headers, _rewrite) =>
          utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

        if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
          setHeaders(header, valueOrRewrite);
        } else if(utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
          setHeaders(parseHeaders(header), valueOrRewrite);
        } else {
          header != null && setHeader(valueOrRewrite, header, rewrite);
        }

        return this;
      }

      get(header, parser) {
        header = normalizeHeader(header);

        if (header) {
          const key = utils$1.findKey(this, header);

          if (key) {
            const value = this[key];

            if (!parser) {
              return value;
            }

            if (parser === true) {
              return parseTokens(value);
            }

            if (utils$1.isFunction(parser)) {
              return parser.call(this, value, key);
            }

            if (utils$1.isRegExp(parser)) {
              return parser.exec(value);
            }

            throw new TypeError('parser must be boolean|regexp|function');
          }
        }
      }

      has(header, matcher) {
        header = normalizeHeader(header);

        if (header) {
          const key = utils$1.findKey(this, header);

          return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
        }

        return false;
      }

      delete(header, matcher) {
        const self = this;
        let deleted = false;

        function deleteHeader(_header) {
          _header = normalizeHeader(_header);

          if (_header) {
            const key = utils$1.findKey(self, _header);

            if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
              delete self[key];

              deleted = true;
            }
          }
        }

        if (utils$1.isArray(header)) {
          header.forEach(deleteHeader);
        } else {
          deleteHeader(header);
        }

        return deleted;
      }

      clear(matcher) {
        const keys = Object.keys(this);
        let i = keys.length;
        let deleted = false;

        while (i--) {
          const key = keys[i];
          if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
            delete this[key];
            deleted = true;
          }
        }

        return deleted;
      }

      normalize(format) {
        const self = this;
        const headers = {};

        utils$1.forEach(this, (value, header) => {
          const key = utils$1.findKey(headers, header);

          if (key) {
            self[key] = normalizeValue(value);
            delete self[header];
            return;
          }

          const normalized = format ? formatHeader(header) : String(header).trim();

          if (normalized !== header) {
            delete self[header];
          }

          self[normalized] = normalizeValue(value);

          headers[normalized] = true;
        });

        return this;
      }

      concat(...targets) {
        return this.constructor.concat(this, ...targets);
      }

      toJSON(asStrings) {
        const obj = Object.create(null);

        utils$1.forEach(this, (value, header) => {
          value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(', ') : value);
        });

        return obj;
      }

      [Symbol.iterator]() {
        return Object.entries(this.toJSON())[Symbol.iterator]();
      }

      toString() {
        return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
      }

      get [Symbol.toStringTag]() {
        return 'AxiosHeaders';
      }

      static from(thing) {
        return thing instanceof this ? thing : new this(thing);
      }

      static concat(first, ...targets) {
        const computed = new this(first);

        targets.forEach((target) => computed.set(target));

        return computed;
      }

      static accessor(header) {
        const internals = this[$internals] = (this[$internals] = {
          accessors: {}
        });

        const accessors = internals.accessors;
        const prototype = this.prototype;

        function defineAccessor(_header) {
          const lHeader = normalizeHeader(_header);

          if (!accessors[lHeader]) {
            buildAccessors(prototype, _header);
            accessors[lHeader] = true;
          }
        }

        utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

        return this;
      }
    }

    AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

    // reserved names hotfix
    utils$1.reduceDescriptors(AxiosHeaders.prototype, ({value}, key) => {
      let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
      return {
        get: () => value,
        set(headerValue) {
          this[mapped] = headerValue;
        }
      }
    });

    utils$1.freezeMethods(AxiosHeaders);

    /**
     * Transform the data for a request or a response
     *
     * @param {Array|Function} fns A single function or Array of functions
     * @param {?Object} response The response object
     *
     * @returns {*} The resulting transformed data
     */
    function transformData(fns, response) {
      const config = this || defaults;
      const context = response || config;
      const headers = AxiosHeaders.from(context.headers);
      let data = context.data;

      utils$1.forEach(fns, function transform(fn) {
        data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
      });

      headers.normalize();

      return data;
    }

    function isCancel(value) {
      return !!(value && value.__CANCEL__);
    }

    /**
     * A `CanceledError` is an object that is thrown when an operation is canceled.
     *
     * @param {string=} message The message.
     * @param {Object=} config The config.
     * @param {Object=} request The request.
     *
     * @returns {CanceledError} The created error.
     */
    function CanceledError(message, config, request) {
      // eslint-disable-next-line no-eq-null,eqeqeq
      AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
      this.name = 'CanceledError';
    }

    utils$1.inherits(CanceledError, AxiosError, {
      __CANCEL__: true
    });

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     *
     * @returns {object} The response.
     */
    function settle(resolve, reject, response) {
      const validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(new AxiosError(
          'Request failed with status code ' + response.status,
          [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
          response.config,
          response.request,
          response
        ));
      }
    }

    var cookies = platform.hasStandardBrowserEnv ?

      // Standard browser envs support document.cookie
      {
        write(name, value, expires, path, domain, secure) {
          const cookie = [name + '=' + encodeURIComponent(value)];

          utils$1.isNumber(expires) && cookie.push('expires=' + new Date(expires).toGMTString());

          utils$1.isString(path) && cookie.push('path=' + path);

          utils$1.isString(domain) && cookie.push('domain=' + domain);

          secure === true && cookie.push('secure');

          document.cookie = cookie.join('; ');
        },

        read(name) {
          const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      }

      :

      // Non-standard browser env (web workers, react-native) lack needed support.
      {
        write() {},
        read() {
          return null;
        },
        remove() {}
      };

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     *
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
    }

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     *
     * @returns {string} The combined URL
     */
    function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/?\/$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    }

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     *
     * @returns {string} The combined full path
     */
    function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    }

    var isURLSameOrigin = platform.hasStandardBrowserEnv ?

    // Standard browser envs have full support of the APIs needed to test
    // whether the request URL is of the same origin as current location.
      (function standardBrowserEnv() {
        const msie = /(msie|trident)/i.test(navigator.userAgent);
        const urlParsingNode = document.createElement('a');
        let originURL;

        /**
        * Parse a URL to discover its components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
        function resolveURL(url) {
          let href = url;

          if (msie) {
            // IE needs attribute set twice to normalize properties
            urlParsingNode.setAttribute('href', href);
            href = urlParsingNode.href;
          }

          urlParsingNode.setAttribute('href', href);

          // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
          return {
            href: urlParsingNode.href,
            protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
            host: urlParsingNode.host,
            search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
            hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
            hostname: urlParsingNode.hostname,
            port: urlParsingNode.port,
            pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
              urlParsingNode.pathname :
              '/' + urlParsingNode.pathname
          };
        }

        originURL = resolveURL(window.location.href);

        /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
        return function isURLSameOrigin(requestURL) {
          const parsed = (utils$1.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
          return (parsed.protocol === originURL.protocol &&
              parsed.host === originURL.host);
        };
      })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
      (function nonStandardBrowserEnv() {
        return function isURLSameOrigin() {
          return true;
        };
      })();

    function parseProtocol(url) {
      const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
      return match && match[1] || '';
    }

    /**
     * Calculate data maxRate
     * @param {Number} [samplesCount= 10]
     * @param {Number} [min= 1000]
     * @returns {Function}
     */
    function speedometer(samplesCount, min) {
      samplesCount = samplesCount || 10;
      const bytes = new Array(samplesCount);
      const timestamps = new Array(samplesCount);
      let head = 0;
      let tail = 0;
      let firstSampleTS;

      min = min !== undefined ? min : 1000;

      return function push(chunkLength) {
        const now = Date.now();

        const startedAt = timestamps[tail];

        if (!firstSampleTS) {
          firstSampleTS = now;
        }

        bytes[head] = chunkLength;
        timestamps[head] = now;

        let i = tail;
        let bytesCount = 0;

        while (i !== head) {
          bytesCount += bytes[i++];
          i = i % samplesCount;
        }

        head = (head + 1) % samplesCount;

        if (head === tail) {
          tail = (tail + 1) % samplesCount;
        }

        if (now - firstSampleTS < min) {
          return;
        }

        const passed = startedAt && now - startedAt;

        return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
      };
    }

    function progressEventReducer(listener, isDownloadStream) {
      let bytesNotified = 0;
      const _speedometer = speedometer(50, 250);

      return e => {
        const loaded = e.loaded;
        const total = e.lengthComputable ? e.total : undefined;
        const progressBytes = loaded - bytesNotified;
        const rate = _speedometer(progressBytes);
        const inRange = loaded <= total;

        bytesNotified = loaded;

        const data = {
          loaded,
          total,
          progress: total ? (loaded / total) : undefined,
          bytes: progressBytes,
          rate: rate ? rate : undefined,
          estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
          event: e
        };

        data[isDownloadStream ? 'download' : 'upload'] = true;

        listener(data);
      };
    }

    const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

    var xhrAdapter = isXHRAdapterSupported && function (config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        let requestData = config.data;
        const requestHeaders = AxiosHeaders.from(config.headers).normalize();
        let {responseType, withXSRFToken} = config;
        let onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }

          if (config.signal) {
            config.signal.removeEventListener('abort', onCanceled);
          }
        }

        let contentType;

        if (utils$1.isFormData(requestData)) {
          if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
            requestHeaders.setContentType(false); // Let the browser set it
          } else if ((contentType = requestHeaders.getContentType()) !== false) {
            // fix semicolon duplication issue for ReactNative FormData implementation
            const [type, ...tokens] = contentType ? contentType.split(';').map(token => token.trim()).filter(Boolean) : [];
            requestHeaders.setContentType([type || 'multipart/form-data', ...tokens].join('; '));
          }
        }

        let request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          const username = config.auth.username || '';
          const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
        }

        const fullPath = buildFullPath(config.baseURL, config.url);

        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        function onloadend() {
          if (!request) {
            return;
          }
          // Prepare the response
          const responseHeaders = AxiosHeaders.from(
            'getAllResponseHeaders' in request && request.getAllResponseHeaders()
          );
          const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
            request.responseText : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };

          settle(function _resolve(value) {
            resolve(value);
            done();
          }, function _reject(err) {
            reject(err);
            done();
          }, response);

          // Clean up request
          request = null;
        }

        if ('onloadend' in request) {
          // Use onloadend if available
          request.onloadend = onloadend;
        } else {
          // Listen for ready state to emulate onloadend
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
              return;
            }
            // readystate handler is calling before onerror or ontimeout handlers,
            // so we should call onloadend on the next 'tick'
            setTimeout(onloadend);
          };
        }

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
          const transitional = config.transitional || transitionalDefaults;
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(new AxiosError(
            timeoutErrorMessage,
            transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
            config,
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if(platform.hasStandardBrowserEnv) {
          withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(config));

          if (withXSRFToken || (withXSRFToken !== false && isURLSameOrigin(fullPath))) {
            // Add xsrf header
            const xsrfValue = config.xsrfHeaderName && config.xsrfCookieName && cookies.read(config.xsrfCookieName);

            if (xsrfValue) {
              requestHeaders.set(config.xsrfHeaderName, xsrfValue);
            }
          }
        }

        // Remove Content-Type if data is undefined
        requestData === undefined && requestHeaders.setContentType(null);

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
            request.setRequestHeader(key, val);
          });
        }

        // Add withCredentials to request if needed
        if (!utils$1.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (responseType && responseType !== 'json') {
          request.responseType = config.responseType;
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
        }

        if (config.cancelToken || config.signal) {
          // Handle cancellation
          // eslint-disable-next-line func-names
          onCanceled = cancel => {
            if (!request) {
              return;
            }
            reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
            request.abort();
            request = null;
          };

          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
          }
        }

        const protocol = parseProtocol(fullPath);

        if (protocol && platform.protocols.indexOf(protocol) === -1) {
          reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
          return;
        }


        // Send the request
        request.send(requestData || null);
      });
    };

    const knownAdapters = {
      http: httpAdapter,
      xhr: xhrAdapter
    };

    utils$1.forEach(knownAdapters, (fn, value) => {
      if (fn) {
        try {
          Object.defineProperty(fn, 'name', {value});
        } catch (e) {
          // eslint-disable-next-line no-empty
        }
        Object.defineProperty(fn, 'adapterName', {value});
      }
    });

    const renderReason = (reason) => `- ${reason}`;

    const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;

    var adapters = {
      getAdapter: (adapters) => {
        adapters = utils$1.isArray(adapters) ? adapters : [adapters];

        const {length} = adapters;
        let nameOrAdapter;
        let adapter;

        const rejectedReasons = {};

        for (let i = 0; i < length; i++) {
          nameOrAdapter = adapters[i];
          let id;

          adapter = nameOrAdapter;

          if (!isResolvedHandle(nameOrAdapter)) {
            adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];

            if (adapter === undefined) {
              throw new AxiosError(`Unknown adapter '${id}'`);
            }
          }

          if (adapter) {
            break;
          }

          rejectedReasons[id || '#' + i] = adapter;
        }

        if (!adapter) {

          const reasons = Object.entries(rejectedReasons)
            .map(([id, state]) => `adapter ${id} ` +
              (state === false ? 'is not supported by the environment' : 'is not available in the build')
            );

          let s = length ?
            (reasons.length > 1 ? 'since :\n' + reasons.map(renderReason).join('\n') : ' ' + renderReason(reasons[0])) :
            'as no adapter specified';

          throw new AxiosError(
            `There is no suitable adapter to dispatch the request ` + s,
            'ERR_NOT_SUPPORT'
          );
        }

        return adapter;
      },
      adapters: knownAdapters
    };

    /**
     * Throws a `CanceledError` if cancellation has been requested.
     *
     * @param {Object} config The config that is to be used for the request
     *
     * @returns {void}
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }

      if (config.signal && config.signal.aborted) {
        throw new CanceledError(null, config);
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     *
     * @returns {Promise} The Promise to be fulfilled
     */
    function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      config.headers = AxiosHeaders.from(config.headers);

      // Transform request data
      config.data = transformData.call(
        config,
        config.transformRequest
      );

      if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
        config.headers.setContentType('application/x-www-form-urlencoded', false);
      }

      const adapter = adapters.getAdapter(config.adapter || defaults.adapter);

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData.call(
          config,
          config.transformResponse,
          response
        );

        response.headers = AxiosHeaders.from(response.headers);

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
            reason.response.headers = AxiosHeaders.from(reason.response.headers);
          }
        }

        return Promise.reject(reason);
      });
    }

    const headersToObject = (thing) => thing instanceof AxiosHeaders ? { ...thing } : thing;

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     *
     * @returns {Object} New object resulting from merging config2 to config1
     */
    function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      const config = {};

      function getMergedValue(target, source, caseless) {
        if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
          return utils$1.merge.call({caseless}, target, source);
        } else if (utils$1.isPlainObject(source)) {
          return utils$1.merge({}, source);
        } else if (utils$1.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      // eslint-disable-next-line consistent-return
      function mergeDeepProperties(a, b, caseless) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(a, b, caseless);
        } else if (!utils$1.isUndefined(a)) {
          return getMergedValue(undefined, a, caseless);
        }
      }

      // eslint-disable-next-line consistent-return
      function valueFromConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(undefined, b);
        }
      }

      // eslint-disable-next-line consistent-return
      function defaultToConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(undefined, b);
        } else if (!utils$1.isUndefined(a)) {
          return getMergedValue(undefined, a);
        }
      }

      // eslint-disable-next-line consistent-return
      function mergeDirectKeys(a, b, prop) {
        if (prop in config2) {
          return getMergedValue(a, b);
        } else if (prop in config1) {
          return getMergedValue(undefined, a);
        }
      }

      const mergeMap = {
        url: valueFromConfig2,
        method: valueFromConfig2,
        data: valueFromConfig2,
        baseURL: defaultToConfig2,
        transformRequest: defaultToConfig2,
        transformResponse: defaultToConfig2,
        paramsSerializer: defaultToConfig2,
        timeout: defaultToConfig2,
        timeoutMessage: defaultToConfig2,
        withCredentials: defaultToConfig2,
        withXSRFToken: defaultToConfig2,
        adapter: defaultToConfig2,
        responseType: defaultToConfig2,
        xsrfCookieName: defaultToConfig2,
        xsrfHeaderName: defaultToConfig2,
        onUploadProgress: defaultToConfig2,
        onDownloadProgress: defaultToConfig2,
        decompress: defaultToConfig2,
        maxContentLength: defaultToConfig2,
        maxBodyLength: defaultToConfig2,
        beforeRedirect: defaultToConfig2,
        transport: defaultToConfig2,
        httpAgent: defaultToConfig2,
        httpsAgent: defaultToConfig2,
        cancelToken: defaultToConfig2,
        socketPath: defaultToConfig2,
        responseEncoding: defaultToConfig2,
        validateStatus: mergeDirectKeys,
        headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
      };

      utils$1.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
        const merge = mergeMap[prop] || mergeDeepProperties;
        const configValue = merge(config1[prop], config2[prop], prop);
        (utils$1.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
      });

      return config;
    }

    const VERSION = "1.6.8";

    const validators$1 = {};

    // eslint-disable-next-line func-names
    ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
      validators$1[type] = function validator(thing) {
        return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
      };
    });

    const deprecatedWarnings = {};

    /**
     * Transitional option validator
     *
     * @param {function|boolean?} validator - set to false if the transitional option has been removed
     * @param {string?} version - deprecated version / removed since version
     * @param {string?} message - some message with additional info
     *
     * @returns {function}
     */
    validators$1.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
      }

      // eslint-disable-next-line func-names
      return (value, opt, opts) => {
        if (validator === false) {
          throw new AxiosError(
            formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
            AxiosError.ERR_DEPRECATED
          );
        }

        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          // eslint-disable-next-line no-console
          console.warn(
            formatMessage(
              opt,
              ' has been deprecated since v' + version + ' and will be removed in the near future'
            )
          );
        }

        return validator ? validator(value, opt, opts) : true;
      };
    };

    /**
     * Assert object's properties type
     *
     * @param {object} options
     * @param {object} schema
     * @param {boolean?} allowUnknown
     *
     * @returns {object}
     */

    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== 'object') {
        throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
      }
      const keys = Object.keys(options);
      let i = keys.length;
      while (i-- > 0) {
        const opt = keys[i];
        const validator = schema[opt];
        if (validator) {
          const value = options[opt];
          const result = value === undefined || validator(value, opt, options);
          if (result !== true) {
            throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
        }
      }
    }

    var validator = {
      assertOptions,
      validators: validators$1
    };

    const validators = validator.validators;

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     *
     * @return {Axios} A new instance of Axios
     */
    class Axios {
      constructor(instanceConfig) {
        this.defaults = instanceConfig;
        this.interceptors = {
          request: new InterceptorManager(),
          response: new InterceptorManager()
        };
      }

      /**
       * Dispatch a request
       *
       * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
       * @param {?Object} config
       *
       * @returns {Promise} The Promise to be fulfilled
       */
      async request(configOrUrl, config) {
        try {
          return await this._request(configOrUrl, config);
        } catch (err) {
          if (err instanceof Error) {
            let dummy;

            Error.captureStackTrace ? Error.captureStackTrace(dummy = {}) : (dummy = new Error());

            // slice off the Error: ... line
            const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, '') : '';

            if (!err.stack) {
              err.stack = stack;
              // match without the 2 top stack lines
            } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ''))) {
              err.stack += '\n' + stack;
            }
          }

          throw err;
        }
      }

      _request(configOrUrl, config) {
        /*eslint no-param-reassign:0*/
        // Allow for axios('example/url'[, config]) a la fetch API
        if (typeof configOrUrl === 'string') {
          config = config || {};
          config.url = configOrUrl;
        } else {
          config = configOrUrl || {};
        }

        config = mergeConfig(this.defaults, config);

        const {transitional, paramsSerializer, headers} = config;

        if (transitional !== undefined) {
          validator.assertOptions(transitional, {
            silentJSONParsing: validators.transitional(validators.boolean),
            forcedJSONParsing: validators.transitional(validators.boolean),
            clarifyTimeoutError: validators.transitional(validators.boolean)
          }, false);
        }

        if (paramsSerializer != null) {
          if (utils$1.isFunction(paramsSerializer)) {
            config.paramsSerializer = {
              serialize: paramsSerializer
            };
          } else {
            validator.assertOptions(paramsSerializer, {
              encode: validators.function,
              serialize: validators.function
            }, true);
          }
        }

        // Set config.method
        config.method = (config.method || this.defaults.method || 'get').toLowerCase();

        // Flatten headers
        let contextHeaders = headers && utils$1.merge(
          headers.common,
          headers[config.method]
        );

        headers && utils$1.forEach(
          ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
          (method) => {
            delete headers[method];
          }
        );

        config.headers = AxiosHeaders.concat(contextHeaders, headers);

        // filter out skipped interceptors
        const requestInterceptorChain = [];
        let synchronousRequestInterceptors = true;
        this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
          if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
            return;
          }

          synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

          requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
        });

        const responseInterceptorChain = [];
        this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
          responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
        });

        let promise;
        let i = 0;
        let len;

        if (!synchronousRequestInterceptors) {
          const chain = [dispatchRequest.bind(this), undefined];
          chain.unshift.apply(chain, requestInterceptorChain);
          chain.push.apply(chain, responseInterceptorChain);
          len = chain.length;

          promise = Promise.resolve(config);

          while (i < len) {
            promise = promise.then(chain[i++], chain[i++]);
          }

          return promise;
        }

        len = requestInterceptorChain.length;

        let newConfig = config;

        i = 0;

        while (i < len) {
          const onFulfilled = requestInterceptorChain[i++];
          const onRejected = requestInterceptorChain[i++];
          try {
            newConfig = onFulfilled(newConfig);
          } catch (error) {
            onRejected.call(this, error);
            break;
          }
        }

        try {
          promise = dispatchRequest.call(this, newConfig);
        } catch (error) {
          return Promise.reject(error);
        }

        i = 0;
        len = responseInterceptorChain.length;

        while (i < len) {
          promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
        }

        return promise;
      }

      getUri(config) {
        config = mergeConfig(this.defaults, config);
        const fullPath = buildFullPath(config.baseURL, config.url);
        return buildURL(fullPath, config.params, config.paramsSerializer);
      }
    }

    // Provide aliases for supported request methods
    utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data
        }));
      };
    });

    utils$1.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/

      function generateHTTPMethod(isForm) {
        return function httpMethod(url, data, config) {
          return this.request(mergeConfig(config || {}, {
            method,
            headers: isForm ? {
              'Content-Type': 'multipart/form-data'
            } : {},
            url,
            data
          }));
        };
      }

      Axios.prototype[method] = generateHTTPMethod();

      Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
    });

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @param {Function} executor The executor function.
     *
     * @returns {CancelToken}
     */
    class CancelToken {
      constructor(executor) {
        if (typeof executor !== 'function') {
          throw new TypeError('executor must be a function.');
        }

        let resolvePromise;

        this.promise = new Promise(function promiseExecutor(resolve) {
          resolvePromise = resolve;
        });

        const token = this;

        // eslint-disable-next-line func-names
        this.promise.then(cancel => {
          if (!token._listeners) return;

          let i = token._listeners.length;

          while (i-- > 0) {
            token._listeners[i](cancel);
          }
          token._listeners = null;
        });

        // eslint-disable-next-line func-names
        this.promise.then = onfulfilled => {
          let _resolve;
          // eslint-disable-next-line func-names
          const promise = new Promise(resolve => {
            token.subscribe(resolve);
            _resolve = resolve;
          }).then(onfulfilled);

          promise.cancel = function reject() {
            token.unsubscribe(_resolve);
          };

          return promise;
        };

        executor(function cancel(message, config, request) {
          if (token.reason) {
            // Cancellation has already been requested
            return;
          }

          token.reason = new CanceledError(message, config, request);
          resolvePromise(token.reason);
        });
      }

      /**
       * Throws a `CanceledError` if cancellation has been requested.
       */
      throwIfRequested() {
        if (this.reason) {
          throw this.reason;
        }
      }

      /**
       * Subscribe to the cancel signal
       */

      subscribe(listener) {
        if (this.reason) {
          listener(this.reason);
          return;
        }

        if (this._listeners) {
          this._listeners.push(listener);
        } else {
          this._listeners = [listener];
        }
      }

      /**
       * Unsubscribe from the cancel signal
       */

      unsubscribe(listener) {
        if (!this._listeners) {
          return;
        }
        const index = this._listeners.indexOf(listener);
        if (index !== -1) {
          this._listeners.splice(index, 1);
        }
      }

      /**
       * Returns an object that contains a new `CancelToken` and a function that, when called,
       * cancels the `CancelToken`.
       */
      static source() {
        let cancel;
        const token = new CancelToken(function executor(c) {
          cancel = c;
        });
        return {
          token,
          cancel
        };
      }
    }

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     *
     * @returns {Function}
     */
    function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    }

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     *
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    function isAxiosError(payload) {
      return utils$1.isObject(payload) && (payload.isAxiosError === true);
    }

    const HttpStatusCode = {
      Continue: 100,
      SwitchingProtocols: 101,
      Processing: 102,
      EarlyHints: 103,
      Ok: 200,
      Created: 201,
      Accepted: 202,
      NonAuthoritativeInformation: 203,
      NoContent: 204,
      ResetContent: 205,
      PartialContent: 206,
      MultiStatus: 207,
      AlreadyReported: 208,
      ImUsed: 226,
      MultipleChoices: 300,
      MovedPermanently: 301,
      Found: 302,
      SeeOther: 303,
      NotModified: 304,
      UseProxy: 305,
      Unused: 306,
      TemporaryRedirect: 307,
      PermanentRedirect: 308,
      BadRequest: 400,
      Unauthorized: 401,
      PaymentRequired: 402,
      Forbidden: 403,
      NotFound: 404,
      MethodNotAllowed: 405,
      NotAcceptable: 406,
      ProxyAuthenticationRequired: 407,
      RequestTimeout: 408,
      Conflict: 409,
      Gone: 410,
      LengthRequired: 411,
      PreconditionFailed: 412,
      PayloadTooLarge: 413,
      UriTooLong: 414,
      UnsupportedMediaType: 415,
      RangeNotSatisfiable: 416,
      ExpectationFailed: 417,
      ImATeapot: 418,
      MisdirectedRequest: 421,
      UnprocessableEntity: 422,
      Locked: 423,
      FailedDependency: 424,
      TooEarly: 425,
      UpgradeRequired: 426,
      PreconditionRequired: 428,
      TooManyRequests: 429,
      RequestHeaderFieldsTooLarge: 431,
      UnavailableForLegalReasons: 451,
      InternalServerError: 500,
      NotImplemented: 501,
      BadGateway: 502,
      ServiceUnavailable: 503,
      GatewayTimeout: 504,
      HttpVersionNotSupported: 505,
      VariantAlsoNegotiates: 506,
      InsufficientStorage: 507,
      LoopDetected: 508,
      NotExtended: 510,
      NetworkAuthenticationRequired: 511,
    };

    Object.entries(HttpStatusCode).forEach(([key, value]) => {
      HttpStatusCode[value] = key;
    });

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     *
     * @returns {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      const context = new Axios(defaultConfig);
      const instance = bind(Axios.prototype.request, context);

      // Copy axios.prototype to instance
      utils$1.extend(instance, Axios.prototype, context, {allOwnKeys: true});

      // Copy context to instance
      utils$1.extend(instance, context, null, {allOwnKeys: true});

      // Factory for creating new instances
      instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };

      return instance;
    }

    // Create the default instance to be exported
    const axios = createInstance(defaults);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios;

    // Expose Cancel & CancelToken
    axios.CanceledError = CanceledError;
    axios.CancelToken = CancelToken;
    axios.isCancel = isCancel;
    axios.VERSION = VERSION;
    axios.toFormData = toFormData;

    // Expose AxiosError class
    axios.AxiosError = AxiosError;

    // alias for CanceledError for backward compatibility
    axios.Cancel = axios.CanceledError;

    // Expose all/spread
    axios.all = function all(promises) {
      return Promise.all(promises);
    };

    axios.spread = spread;

    // Expose isAxiosError
    axios.isAxiosError = isAxiosError;

    // Expose mergeConfig
    axios.mergeConfig = mergeConfig;

    axios.AxiosHeaders = AxiosHeaders;

    axios.formToJSON = thing => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);

    axios.getAdapter = adapters.getAdapter;

    axios.HttpStatusCode = HttpStatusCode;

    axios.default = axios;

    // Creamos una instancia de Axios
    const instance$b = axios.create({
      baseURL: 'http://localhost:3000', // Establece la URL base para todas las solicitudes
      // Puedes agregar otras configuraciones comunes aquí
    });

    // Interceptores de solicitud
    instance$b.interceptors.request.use(
      (config) => {
        // Aquí puedes modificar la configuración de la solicitud antes de enviarla
        const token = localStorage.getItem('token'); // Suponiendo que el token se almacena en el localStorage
        if (token) {
          config.headers.Authorization = `Bearer ${token}`; // Agregamos el token a los encabezados de la solicitud
        }
        return config;
      },
      (error) => {
        // Manejo de errores de solicitud
        return Promise.reject(error);
      }
    );

    /* src\components\Cards\CardProduct.svelte generated by Svelte v3.35.0 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (131:8) {#each responseData as product}
    function create_each_block_1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*product*/ ctx[16].nombre + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*product*/ ctx[16].precio + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*product*/ ctx[16].description + "";
    	let t4;
    	let t5;
    	let td3;
    	let tableaddshoppingcart;
    	let t6;
    	let current;
    	tableaddshoppingcart = new TableAddShoppingCart({ props: { product: /*product*/ ctx[16] } });
    	tableaddshoppingcart.$on("customEvent", /*handleCustomEvent*/ ctx[2]);

    	return {
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			create_component(tableaddshoppingcart.$$.fragment);
    			t6 = space();
    			attr(td0, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td1, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td2, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td3, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);
    			append(td1, t2);
    			append(tr, t3);
    			append(tr, td2);
    			append(td2, t4);
    			append(tr, t5);
    			append(tr, td3);
    			mount_component(tableaddshoppingcart, td3, null);
    			append(tr, t6);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*responseData*/ 1) && t0_value !== (t0_value = /*product*/ ctx[16].nombre + "")) set_data(t0, t0_value);
    			if ((!current || dirty & /*responseData*/ 1) && t2_value !== (t2_value = /*product*/ ctx[16].precio + "")) set_data(t2, t2_value);
    			if ((!current || dirty & /*responseData*/ 1) && t4_value !== (t4_value = /*product*/ ctx[16].description + "")) set_data(t4, t4_value);
    			const tableaddshoppingcart_changes = {};
    			if (dirty & /*responseData*/ 1) tableaddshoppingcart_changes.product = /*product*/ ctx[16];
    			tableaddshoppingcart.$set(tableaddshoppingcart_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tableaddshoppingcart.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tableaddshoppingcart.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			destroy_component(tableaddshoppingcart);
    		}
    	};
    }

    // (189:8) {#each carrito as item}
    function create_each_block$2(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*item*/ ctx[13].nombre + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*item*/ ctx[13].precio + "";
    	let t2;
    	let t3;
    	let td2;
    	let div;
    	let button0;
    	let t5;
    	let input;
    	let t6;
    	let button1;
    	let t8;
    	let td3;
    	let t9_value = /*item*/ ctx[13].description + "";
    	let t9;
    	let t10;
    	let td4;
    	let button2;
    	let t12;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*item*/ ctx[13]);
    	}

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[7].call(input, /*each_value*/ ctx[14], /*item_index*/ ctx[15]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[8](/*item*/ ctx[13]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[9](/*item*/ ctx[13]);
    	}

    	return {
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "-";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "+";
    			t8 = space();
    			td3 = element("td");
    			t9 = text(t9_value);
    			t10 = space();
    			td4 = element("td");
    			button2 = element("button");
    			button2.textContent = "Comprar";
    			t12 = space();
    			attr(td0, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td1, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(button0, "class", "bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-l");
    			attr(input, "type", "number");
    			attr(input, "min", "1");
    			attr(input, "class", "w-full border border-gray-300 rounded px-3 py-1 focus:outline-none focus:border-indigo-500 text-xs text-center");
    			attr(button1, "class", "bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-r");
    			attr(div, "class", "flex items-center");
    			attr(td2, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td3, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(button2, "class", "bg-red-600 text-white active:bg-red-400 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150");
    			attr(td4, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);
    			append(td1, t2);
    			append(tr, t3);
    			append(tr, td2);
    			append(td2, div);
    			append(div, button0);
    			append(div, t5);
    			append(div, input);
    			set_input_value(input, /*item*/ ctx[13].cantidad);
    			append(div, t6);
    			append(div, button1);
    			append(tr, t8);
    			append(tr, td3);
    			append(td3, t9);
    			append(tr, t10);
    			append(tr, td4);
    			append(td4, button2);
    			append(tr, t12);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", click_handler),
    					listen(input, "input", input_input_handler),
    					listen(button1, "click", click_handler_1),
    					listen(button2, "click", click_handler_2)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*carrito*/ 2 && t0_value !== (t0_value = /*item*/ ctx[13].nombre + "")) set_data(t0, t0_value);
    			if (dirty & /*carrito*/ 2 && t2_value !== (t2_value = /*item*/ ctx[13].precio + "")) set_data(t2, t2_value);

    			if (dirty & /*carrito*/ 2 && to_number(input.value) !== /*item*/ ctx[13].cantidad) {
    				set_input_value(input, /*item*/ ctx[13].cantidad);
    			}

    			if (dirty & /*carrito*/ 2 && t9_value !== (t9_value = /*item*/ ctx[13].description + "")) set_data(t9, t9_value);
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let div4;
    	let div2;
    	let div1;
    	let div0;
    	let h30;
    	let t0;
    	let t1;
    	let div3;
    	let table0;
    	let thead0;
    	let tr0;
    	let th0;
    	let t2;
    	let t3;
    	let th1;
    	let t4;
    	let t5;
    	let th2;
    	let t6;
    	let t7;
    	let th3;
    	let t8;
    	let t9;
    	let tbody0;
    	let t10;
    	let div9;
    	let div7;
    	let div6;
    	let div5;
    	let h31;
    	let t11;
    	let t12;
    	let div8;
    	let table1;
    	let thead1;
    	let tr1;
    	let th4;
    	let t13;
    	let t14;
    	let th5;
    	let t15;
    	let t16;
    	let th6;
    	let t17;
    	let t18;
    	let th7;
    	let t19;
    	let t20;
    	let th8;
    	let t21;
    	let t22;
    	let tbody1;
    	let current;
    	let each_value_1 = /*responseData*/ ctx[0];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*carrito*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div4 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			t0 = text("Lista de productos");
    			t1 = space();
    			div3 = element("div");
    			table0 = element("table");
    			thead0 = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			t2 = text("Nombre Producto");
    			t3 = space();
    			th1 = element("th");
    			t4 = text("Producto Precio");
    			t5 = space();
    			th2 = element("th");
    			t6 = text("Producto Descripción");
    			t7 = space();
    			th3 = element("th");
    			t8 = text("Agregar al carrito de compras");
    			t9 = space();
    			tbody0 = element("tbody");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t10 = space();
    			div9 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			h31 = element("h3");
    			t11 = text("Tabla carrito de Compras");
    			t12 = space();
    			div8 = element("div");
    			table1 = element("table");
    			thead1 = element("thead");
    			tr1 = element("tr");
    			th4 = element("th");
    			t13 = text("Nombre Producto");
    			t14 = space();
    			th5 = element("th");
    			t15 = text("Producto Precio");
    			t16 = space();
    			th6 = element("th");
    			t17 = text("Cantidad");
    			t18 = space();
    			th7 = element("th");
    			t19 = text("Producto Descripción");
    			t20 = space();
    			th8 = element("th");
    			t21 = text("Acciones");
    			t22 = space();
    			tbody1 = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(h30, "class", "font-semibold text-lg " + ("text-blueGray-700" ));
    			attr(div0, "class", "relative w-full px-4 max-w-full flex-grow flex-1");
    			attr(div1, "class", "flex flex-wrap items-center");
    			attr(div2, "class", "rounded-t mb-0 px-4 py-3 border-0");

    			attr(th0, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th1, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th2, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th3, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(table0, "class", "items-center w-full bg-transparent border-collapse");
    			attr(div3, "class", "block w-full overflow-x-auto");
    			attr(div4, "class", "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded " + ("bg-white" ));
    			attr(h31, "class", "font-semibold text-lg " + ("text-blueGray-700" ));
    			attr(div5, "class", "relative w-full px-4 max-w-full flex-grow flex-1");
    			attr(div6, "class", "flex flex-wrap items-center");
    			attr(div7, "class", "rounded-t mb-0 px-4 py-3 border-0");

    			attr(th4, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th5, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th6, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th7, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th8, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(table1, "class", "items-center w-full bg-transparent border-collapse");
    			attr(div8, "class", "block w-full overflow-x-auto");
    			attr(div9, "class", "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded " + ("bg-white" ));
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div2);
    			append(div2, div1);
    			append(div1, div0);
    			append(div0, h30);
    			append(h30, t0);
    			append(div4, t1);
    			append(div4, div3);
    			append(div3, table0);
    			append(table0, thead0);
    			append(thead0, tr0);
    			append(tr0, th0);
    			append(th0, t2);
    			append(tr0, t3);
    			append(tr0, th1);
    			append(th1, t4);
    			append(tr0, t5);
    			append(tr0, th2);
    			append(th2, t6);
    			append(tr0, t7);
    			append(tr0, th3);
    			append(th3, t8);
    			append(table0, t9);
    			append(table0, tbody0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(tbody0, null);
    			}

    			insert(target, t10, anchor);
    			insert(target, div9, anchor);
    			append(div9, div7);
    			append(div7, div6);
    			append(div6, div5);
    			append(div5, h31);
    			append(h31, t11);
    			append(div9, t12);
    			append(div9, div8);
    			append(div8, table1);
    			append(table1, thead1);
    			append(thead1, tr1);
    			append(tr1, th4);
    			append(th4, t13);
    			append(tr1, t14);
    			append(tr1, th5);
    			append(th5, t15);
    			append(tr1, t16);
    			append(tr1, th6);
    			append(th6, t17);
    			append(tr1, t18);
    			append(tr1, th7);
    			append(th7, t19);
    			append(tr1, t20);
    			append(tr1, th8);
    			append(th8, t21);
    			append(table1, t22);
    			append(table1, tbody1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody1, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*responseData, handleCustomEvent*/ 5) {
    				each_value_1 = /*responseData*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(tbody0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*buyProduct, carrito, incrementarCantidad, decrementarCantidad*/ 58) {
    				each_value = /*carrito*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t10);
    			if (detaching) detach(div9);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let responseData = [];
    	let carrito = [];
    	let responseMessage = "";

    	// Suscribirse al evento desde ComponenteA
    	async function fetchData() {
    		try {
    			const response = await instance$b.get("/productos");
    			$$invalidate(0, responseData = response.data);
    		} catch(error) {
    			console.error("Error fetching data:", error);
    		}
    	}

    	onMount(fetchData);

    	const handleCustomEvent = event => {
    		agregarAlCarrito(event.detail.producto);
    	};

    	function agregarAlCarrito(producto) {
    		const existeEnCarrito = carrito.find(item => item.id === producto.id);

    		// Si el producto ya está en el carrito, no lo agregamos de nuevo
    		if (existeEnCarrito) return;

    		// Creamos un nuevo objeto con la cantidad inicializada en la cantidad real del producto
    		const productoConCantidad = { ...producto, cantidad: 1 };

    		$$invalidate(1, carrito = [...carrito, productoConCantidad]);
    	}

    	function incrementarCantidad(item) {
    		const index = carrito.indexOf(item);
    		const updatedItem = { ...item, cantidad: item.cantidad + 1 };
    		$$invalidate(1, carrito = [...carrito.slice(0, index), updatedItem, ...carrito.slice(index + 1)]);
    	}

    	function decrementarCantidad(item) {
    		if (item.cantidad > 0) {
    			const index = carrito.indexOf(item);
    			const updatedItem = { ...item, cantidad: item.cantidad - 1 };
    			$$invalidate(1, carrito = [...carrito.slice(0, index), updatedItem, ...carrito.slice(index + 1)]);
    		}
    	}

    	async function buyProduct(item) {
    		console.log(item);

    		if (!item.cantidad || item.cantidad <= 0) {
    			sweetalert2_all.fire({
    				icon: "error",
    				text: "El campo no puede estar vacío, ser igual a 0 o contener números negativoss."
    			});

    			return; // Salir de la función si hay campos vacíos
    		}

    		let postData = {
    			"productoId": item.id,
    			"cantidad": item.cantidad
    		};

    		try {
    			const response = await instance$b.post("/pedidos", postData);
    			responseMessage = response.data.message;
    			sweetalert2_all.fire({ icon: "success", text: responseMessage });
    			$$invalidate(1, carrito = carrito.filter(producto => producto !== item));
    		} catch(error) {
    			console.error("Error sending data:", error);
    			sweetalert2_all.fire({ icon: "error", text: error });
    		}
    	}

    	const click_handler = item => decrementarCantidad(item);

    	function input_input_handler(each_value, item_index) {
    		each_value[item_index].cantidad = to_number(this.value);
    		$$invalidate(1, carrito);
    	}

    	const click_handler_1 = item => incrementarCantidad(item);
    	const click_handler_2 = item => buyProduct(item);

    	return [
    		responseData,
    		carrito,
    		handleCustomEvent,
    		incrementarCantidad,
    		decrementarCantidad,
    		buyProduct,
    		click_handler,
    		input_input_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class CardProduct extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$a, create_fragment$d, safe_not_equal, {});
    	}
    }

    /* src\views\admin\Buyproduct.svelte generated by Svelte v3.35.0 */

    function create_fragment$c(ctx) {
    	let div;
    	let cardproduct;
    	let current;
    	cardproduct = new CardProduct({});

    	return {
    		c() {
    			div = element("div");
    			create_component(cardproduct.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(cardproduct, div, null);
    			current = true;
    		},
    		p: noop$1,
    		i(local) {
    			if (current) return;
    			transition_in(cardproduct.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardproduct.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(cardproduct);
    		}
    	};
    }

    class Buyproduct extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$c, safe_not_equal, {});
    	}
    }

    /* src\components\Dropdowns\TableEditProduct.svelte generated by Svelte v3.35.0 */

    function create_fragment$b(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.innerHTML = `<i class="fas fa-pencil-alt"></i>`;
    			attr(button, "class", "text-blueGray-500 py-1 px-3 rounded-full");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    			/*button_binding*/ ctx[3](button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleEdit*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*button_binding*/ ctx[3](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { product } = $$props;
    	const dispatch = createEventDispatcher();
    	let btnDropdownRef;

    	const handleEdit = () => {
    		sweetalert2_all.fire({
    			title: "Editar Producto",
    			html: `<form id="editProductForm">
        <h6 class="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
          Producto Información
        </h6>
        <div class="flex flex-wrap">
          <div class="w-full lg:w-6/12 px-4">
            <div class="relative w-full mb-3">
              <label
                class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                for="grid-nameProduct"
              >
                Nombre Producto
              </label>
              <input
                id="grid-nameProduct"
                type="text"
                name="grid-nameProduct" 
                class="swal2-input border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                required  
                value="${product.nombre}"
              />
            </div>
          </div>
          <div class="w-full lg:w-6/12 px-4">
            <div class="relative w-full mb-3">
              <label
                class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                for="grid-price"
              >
                Precio Producto
              </label>
              <input
                id="grid-price"
                type="number"
                name="grid-price"
                class="swal2-input border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                required
                value="${product.precio}"
              />
            </div>
          </div>
        </div>
        <div class="flex flex-wrap">
          <div class="w-full lg:w-12/12 px-4">
            <div class="relative w-full mb-3">
              <label
                class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                for="grid-Description"
              >
                Descripción
              </label>
              <textarea
                id="grid-Description"
                name="grid-Description"
                type="text"
                class="swal2-textarea border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                rows="4"
                required
              >${product.description}</textarea> 
            </div>
          </div>
        </div>
      </form>`,
    			icon: "info",
    			showCancelButton: true,
    			confirmButtonText: "Guardar Cambios",
    			cancelButtonText: "Cancelar",
    			preConfirm: () => {
    				const form = document.getElementById("editProductForm");

    				if (!form.checkValidity()) {
    					sweetalert2_all.showValidationMessage("Por favor, completa todos los campos.");
    					return false;
    				} else {
    					const formData = new FormData(form);
    					const nombre = formData.get("grid-nameProduct");
    					const precio = formData.get("grid-price");
    					const descripcion = formData.get("grid-Description");

    					// Enviar los datos del formulario a tu backend usando Axios
    					instance$b.put("http://localhost:3000/productosUpdate", {
    						id: product.id,
    						nombre,
    						precio,
    						description: descripcion
    					}).then(response => {
    						dispatch("customEvent");
    						sweetalert2_all.fire("¡Cambios Guardados!", "", "success");
    					}).catch(error => {
    						console.error("Error al enviar datos:", error);
    						sweetalert2_all.fire("Error", "Ocurrió un error al guardar los cambios.", "error");
    					});
    				}
    			}
    		});
    	};

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			btnDropdownRef = $$value;
    			$$invalidate(0, btnDropdownRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("product" in $$props) $$invalidate(2, product = $$props.product);
    	};

    	return [btnDropdownRef, handleEdit, product, button_binding];
    }

    class TableEditProduct extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$9, create_fragment$b, safe_not_equal, { product: 2 });
    	}
    }

    /* src\components\Dropdowns\TableDeleteProduct.svelte generated by Svelte v3.35.0 */

    function create_fragment$a(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.innerHTML = `<i class="fas fa-trash"></i>`;
    			attr(button, "class", "text-blueGray-500 py-1 px-3 rounded-full");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    			/*button_binding*/ ctx[3](button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleDelete*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*button_binding*/ ctx[3](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { product } = $$props;
    	const dispatch = createEventDispatcher();
    	let btnDropdownRef;

    	const handleDelete = () => {
    		// Mostrar el modal de confirmación de SweetAlert2
    		sweetalert2_all.fire({
    			title: "¿Estás seguro?",
    			text: "¡No podrás revertir esto!",
    			icon: "warning",
    			showCancelButton: true,
    			confirmButtonColor: "#d33",
    			cancelButtonColor: "#3085d6",
    			confirmButtonText: "Sí, eliminarlo"
    		}).then(result => {
    			if (result.isConfirmed) {
    				// Enviar la solicitud de eliminación al backend
    				instance$b.delete(`/productosDelete/${product.id}`).then(response => {
    					dispatch("customEvent");
    					sweetalert2_all.fire("¡Eliminado!", "El producto ha sido eliminado exitosamente.", "success");
    				}).catch(error => {
    					// Manejar cualquier error que ocurra durante la eliminación
    					console.error("Error al eliminar el producto:", error);

    					sweetalert2_all.fire("Error", "Se produjo un error al intentar eliminar el producto.", "error");
    				});
    			}
    		});
    	};

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			btnDropdownRef = $$value;
    			$$invalidate(0, btnDropdownRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("product" in $$props) $$invalidate(2, product = $$props.product);
    	};

    	return [btnDropdownRef, handleDelete, product, button_binding];
    }

    class TableDeleteProduct extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$a, safe_not_equal, { product: 2 });
    	}
    }

    function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i?i.push(e):n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&(e?i.splice(i.indexOf(e)>>>0,1):n.set(t,[]));},emit:function(t,e){var i=n.get(t);i&&i.slice().map(function(n){n(e);}),(i=n.get("*"))&&i.slice().map(function(n){n(t,e);});}}}

    // eventBus.js

    // Crear un nuevo bus de eventos
    const eventBus = mitt();

    /* src\components\Cards\CardTable.svelte generated by Svelte v3.35.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (51:4) {:else}
    function create_else_block(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t0;
    	let th0_class_value;
    	let t1;
    	let th1;
    	let t2;
    	let th1_class_value;
    	let t3;
    	let th2;
    	let t4;
    	let th2_class_value;
    	let t5;
    	let th3;
    	let t6;
    	let th3_class_value;
    	let t7;
    	let th4;
    	let t8;
    	let th4_class_value;
    	let t9;
    	let tbody;
    	let current;
    	let each_value = /*responseData*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			t0 = text("Nombre Producto");
    			t1 = space();
    			th1 = element("th");
    			t2 = text("Producto Precio");
    			t3 = space();
    			th2 = element("th");
    			t4 = text("Producto Descripción");
    			t5 = space();
    			th3 = element("th");
    			t6 = text("Editar");
    			t7 = space();
    			th4 = element("th");
    			t8 = text("Eliminar");
    			t9 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(th0, "class", th0_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"));

    			attr(th1, "class", th1_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"));

    			attr(th2, "class", th2_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"));

    			attr(th3, "class", th3_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"));

    			attr(th4, "class", th4_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"));

    			attr(table, "class", "items-center w-full bg-transparent border-collapse");
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, th0);
    			append(th0, t0);
    			append(tr, t1);
    			append(tr, th1);
    			append(th1, t2);
    			append(tr, t3);
    			append(tr, th2);
    			append(th2, t4);
    			append(tr, t5);
    			append(tr, th3);
    			append(th3, t6);
    			append(tr, t7);
    			append(tr, th4);
    			append(th4, t8);
    			append(table, t9);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*color*/ 1 && th0_class_value !== (th0_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"))) {
    				attr(th0, "class", th0_class_value);
    			}

    			if (!current || dirty & /*color*/ 1 && th1_class_value !== (th1_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"))) {
    				attr(th1, "class", th1_class_value);
    			}

    			if (!current || dirty & /*color*/ 1 && th2_class_value !== (th2_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"))) {
    				attr(th2, "class", th2_class_value);
    			}

    			if (!current || dirty & /*color*/ 1 && th3_class_value !== (th3_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"))) {
    				attr(th3, "class", th3_class_value);
    			}

    			if (!current || dirty & /*color*/ 1 && th4_class_value !== (th4_class_value = "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + (/*color*/ ctx[0] === "light"
    			? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			: "bg-red-700 text-red-200 border-red-600"))) {
    				attr(th4, "class", th4_class_value);
    			}

    			if (dirty & /*responseData, handleCustomEvent*/ 6) {
    				each_value = /*responseData*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (49:4) {#if responseData.length === 0}
    function create_if_block(ctx) {
    	let p;

    	return {
    		c() {
    			p = element("p");
    			p.textContent = "No hay datos disponibles en la tabla.";
    			attr(p, "class", "text-center py-4");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (74:8) {#each responseData as product}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*product*/ ctx[4].nombre + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*product*/ ctx[4].precio + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*product*/ ctx[4].description + "";
    	let t4;
    	let t5;
    	let td3;
    	let tableeditproduct;
    	let t6;
    	let td4;
    	let tabledeleteproduct;
    	let t7;
    	let current;
    	tableeditproduct = new TableEditProduct({ props: { product: /*product*/ ctx[4] } });
    	tableeditproduct.$on("customEvent", /*handleCustomEvent*/ ctx[2]);
    	tabledeleteproduct = new TableDeleteProduct({ props: { product: /*product*/ ctx[4] } });
    	tabledeleteproduct.$on("customEvent", /*handleCustomEvent*/ ctx[2]);

    	return {
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			create_component(tableeditproduct.$$.fragment);
    			t6 = space();
    			td4 = element("td");
    			create_component(tabledeleteproduct.$$.fragment);
    			t7 = space();
    			attr(td0, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td1, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td2, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td3, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td4, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);
    			append(td1, t2);
    			append(tr, t3);
    			append(tr, td2);
    			append(td2, t4);
    			append(tr, t5);
    			append(tr, td3);
    			mount_component(tableeditproduct, td3, null);
    			append(tr, t6);
    			append(tr, td4);
    			mount_component(tabledeleteproduct, td4, null);
    			append(tr, t7);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*responseData*/ 2) && t0_value !== (t0_value = /*product*/ ctx[4].nombre + "")) set_data(t0, t0_value);
    			if ((!current || dirty & /*responseData*/ 2) && t2_value !== (t2_value = /*product*/ ctx[4].precio + "")) set_data(t2, t2_value);
    			if ((!current || dirty & /*responseData*/ 2) && t4_value !== (t4_value = /*product*/ ctx[4].description + "")) set_data(t4, t4_value);
    			const tableeditproduct_changes = {};
    			if (dirty & /*responseData*/ 2) tableeditproduct_changes.product = /*product*/ ctx[4];
    			tableeditproduct.$set(tableeditproduct_changes);
    			const tabledeleteproduct_changes = {};
    			if (dirty & /*responseData*/ 2) tabledeleteproduct_changes.product = /*product*/ ctx[4];
    			tabledeleteproduct.$set(tabledeleteproduct_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tableeditproduct.$$.fragment, local);
    			transition_in(tabledeleteproduct.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tableeditproduct.$$.fragment, local);
    			transition_out(tabledeleteproduct.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			destroy_component(tableeditproduct);
    			destroy_component(tabledeleteproduct);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let div4;
    	let div2;
    	let div1;
    	let div0;
    	let h3;
    	let t0;
    	let h3_class_value;
    	let t1;
    	let div3;
    	let current_block_type_index;
    	let if_block;
    	let div4_class_value;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*responseData*/ ctx[1].length === 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div4 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t0 = text("Tabla de productos");
    			t1 = space();
    			div3 = element("div");
    			if_block.c();

    			attr(h3, "class", h3_class_value = "font-semibold text-lg " + (/*color*/ ctx[0] === "light"
    			? "text-blueGray-700"
    			: "text-white"));

    			attr(div0, "class", "relative w-full px-4 max-w-full flex-grow flex-1");
    			attr(div1, "class", "flex flex-wrap items-center");
    			attr(div2, "class", "rounded-t mb-0 px-4 py-3 border-0");
    			attr(div3, "class", "block w-full overflow-x-auto");

    			attr(div4, "class", div4_class_value = "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded " + (/*color*/ ctx[0] === "light"
    			? "bg-white"
    			: "bg-red-800 text-white"));
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div2);
    			append(div2, div1);
    			append(div1, div0);
    			append(div0, h3);
    			append(h3, t0);
    			append(div4, t1);
    			append(div4, div3);
    			if_blocks[current_block_type_index].m(div3, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*color*/ 1 && h3_class_value !== (h3_class_value = "font-semibold text-lg " + (/*color*/ ctx[0] === "light"
    			? "text-blueGray-700"
    			: "text-white"))) {
    				attr(h3, "class", h3_class_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div3, null);
    			}

    			if (!current || dirty & /*color*/ 1 && div4_class_value !== (div4_class_value = "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded " + (/*color*/ ctx[0] === "light"
    			? "bg-white"
    			: "bg-red-800 text-white"))) {
    				attr(div4, "class", div4_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { color = "light" } = $$props;

    	// Suscribirse al evento desde ComponenteA
    	eventBus.on("cretaleTable", () => {
    		fetchData();
    	});

    	// can be one of light or dark
    	let responseData = 0;

    	async function fetchData() {
    		try {
    			const response = await instance$b.get("/productos");
    			$$invalidate(1, responseData = response.data);
    		} catch(error) {
    			console.error("Error fetching data:", error);
    		}
    	}

    	onMount(fetchData);

    	const handleCustomEvent = () => {
    		fetchData();
    	};

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    	};

    	return [color, responseData, handleCustomEvent];
    }

    class CardTable extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$9, safe_not_equal, { color: 0 });
    	}
    }

    /* src\components\Cards\CardSettings.svelte generated by Svelte v3.35.0 */

    function create_fragment$8(ctx) {
    	let div12;
    	let div1;
    	let t1;
    	let div11;
    	let form;
    	let h61;
    	let t3;
    	let div6;
    	let t9;
    	let div9;
    	let t12;
    	let div10;
    	let button0;
    	let t14;
    	let button1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div12 = element("div");
    			div1 = element("div");
    			div1.innerHTML = `<div class="text-center flex justify-centrer"><h6 class="text-blueGray-700 text-xl font-bold">Crear Producto</h6></div>`;
    			t1 = space();
    			div11 = element("div");
    			form = element("form");
    			h61 = element("h6");
    			h61.textContent = "Producto Información";
    			t3 = space();
    			div6 = element("div");

    			div6.innerHTML = `<div class="w-full lg:w-6/12 px-4"><div class="relative w-full mb-3"><label class="block uppercase text-blueGray-600 text-xs font-bold mb-2" for="grid-nameProduct">Nombre Producto</label> 
            <input id="grid-nameProduct" type="text" class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150" required=""/></div></div> 
        <div class="w-full lg:w-6/12 px-4"><div class="relative w-full mb-3"><label class="block uppercase text-blueGray-600 text-xs font-bold mb-2" for="grid-price">Precio Producto</label> 
            <input id="grid-price" type="number" class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150" required=""/></div></div>`;

    			t9 = space();
    			div9 = element("div");

    			div9.innerHTML = `<div class="w-full lg:w-12/12 px-4"><div class="relative w-full mb-3"><label class="block uppercase text-blueGray-600 text-xs font-bold mb-2" for="grid-Description">Descripción</label> 
            <textarea id="grid-Description" type="text" class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150" rows="4" required=""></textarea></div></div>`;

    			t12 = space();
    			div10 = element("div");
    			button0 = element("button");
    			button0.textContent = "Cancelar";
    			t14 = space();
    			button1 = element("button");
    			button1.textContent = "Guardar";
    			attr(div1, "class", "rounded-t bg-white mb-0 px-6 py-6");
    			attr(h61, "class", "text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase");
    			attr(div6, "class", "flex flex-wrap");
    			attr(div9, "class", "flex flex-wrap");
    			attr(button0, "class", "bg-red-600 text-white active:bg-red-400 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150");
    			attr(button0, "type", "button");
    			attr(button1, "class", "bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150");
    			attr(button1, "type", "button");
    			attr(div10, "class", "text-center mt-6 flex justify-center");
    			attr(div11, "class", "flex-auto px-4 lg:px-10 py-10 pt-0");
    			attr(div12, "class", "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-100 border-0");
    		},
    		m(target, anchor) {
    			insert(target, div12, anchor);
    			append(div12, div1);
    			append(div12, t1);
    			append(div12, div11);
    			append(div11, form);
    			append(form, h61);
    			append(form, t3);
    			append(form, div6);
    			append(form, t9);
    			append(form, div9);
    			append(form, t12);
    			append(form, div10);
    			append(div10, button0);
    			append(div10, t14);
    			append(div10, button1);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", cleanFields),
    					listen(button1, "click", /*saveInformation*/ ctx[0])
    				];

    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div12);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function cleanFields() {
    	document.getElementById("grid-nameProduct").value = "";
    	document.getElementById("grid-price").value = "";
    	document.getElementById("grid-Description").value = "";
    }

    function instance$6($$self) {
    	let nameProduct = "";
    	let priceProduct = "";
    	let descriptionProduct = "";
    	let responseMessage = "";

    	async function saveInformation() {
    		// Almacena los valores de los campos de entrada en las variables
    		nameProduct = document.getElementById("grid-nameProduct").value;

    		priceProduct = document.getElementById("grid-price").value;
    		descriptionProduct = document.getElementById("grid-Description").value;

    		if (!nameProduct || !priceProduct || !descriptionProduct) {
    			sweetalert2_all.fire({
    				icon: "error",
    				text: "Por favor, complete todos los campos"
    			});

    			return; // Salir de la función si hay campos vacíos
    		}

    		let postData = {
    			nombre: nameProduct,
    			precio: priceProduct,
    			description: descriptionProduct
    		};

    		try {
    			const response = await instance$b.post("/productos", postData);
    			responseMessage = response.data.message;
    			sweetalert2_all.fire({ icon: "success", text: responseMessage });
    			eventBus.emit("cretaleTable");
    			cleanFields();
    		} catch(error) {
    			console.error("Error sending data:", error);
    			sweetalert2_all.fire({ icon: "error", text: error });
    		}
    	}

    	return [saveInformation];
    }

    class CardSettings extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$8, safe_not_equal, {});
    	}
    }

    /* src\views\admin\CreateProducts.svelte generated by Svelte v3.35.0 */

    function create_fragment$7(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let cardtable;
    	let t;
    	let div1;
    	let cardsettings;
    	let current;
    	cardtable = new CardTable({});
    	cardsettings = new CardSettings({});

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(cardtable.$$.fragment);
    			t = space();
    			div1 = element("div");
    			create_component(cardsettings.$$.fragment);
    			attr(div0, "class", "w-full mb-12 px-4");
    			attr(div1, "class", "w-full mb-12 px-4");
    			attr(div2, "class", "flex flex-wrap mt-");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, div0);
    			mount_component(cardtable, div0, null);
    			append(div2, t);
    			append(div2, div1);
    			mount_component(cardsettings, div1, null);
    			current = true;
    		},
    		p: noop$1,
    		i(local) {
    			if (current) return;
    			transition_in(cardtable.$$.fragment, local);
    			transition_in(cardsettings.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardtable.$$.fragment, local);
    			transition_out(cardsettings.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			destroy_component(cardtable);
    			destroy_component(cardsettings);
    		}
    	};
    }

    class CreateProducts extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* src\components\Dropdowns\TableEditPurchase.svelte generated by Svelte v3.35.0 */

    function create_fragment$6(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.innerHTML = `<i class="fas fa-pencil-alt"></i>`;
    			attr(button, "class", "text-blueGray-500 py-1 px-3 rounded-full");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    			/*button_binding*/ ctx[3](button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleDelete*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*button_binding*/ ctx[3](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { item } = $$props;
    	const dispatch = createEventDispatcher();
    	let btnDropdownRef;

    	const handleDelete = () => {
    		// Mostrar el modal de confirmación de SweetAlert2
    		sweetalert2_all.fire({
    			title: "¿Estás seguro? Editar la cantidad de productos que quiere comparar",
    			icon: "warning",
    			showCancelButton: true,
    			confirmButtonColor: "#d33",
    			cancelButtonColor: "#3085d6",
    			confirmButtonText: "Sí, Editar cantidad "
    		}).then(result => {
    			if (result.isConfirmed) {
    				// Enviar la solicitud de eliminación al backend
    				if (!item.cantidad || item.cantidad <= 0) {
    					sweetalert2_all.fire({
    						icon: "error",
    						text: "El campo no puede estar vacío, ser igual a 0 o contener números negativoss."
    					});
    				} else {
    					instance$b.put("/pedidosUpdate", {
    						id: item.id, // Salir de la función si hay campos vacíos
    						cantidad: item.cantidad
    					}).then(response => {
    						if (response) {
    							dispatch("customEvent");
    							sweetalert2_all.fire("¡Cambios Guardados!", "", "success");
    						}
    					}).catch(error => {
    						console.error("Error al enviar datos:", error);
    						sweetalert2_all.fire("Error", "Ocurrió un error al guardar los cambios.", "error");
    					});
    				}
    			}
    		});
    	};

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			btnDropdownRef = $$value;
    			$$invalidate(0, btnDropdownRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(2, item = $$props.item);
    	};

    	return [btnDropdownRef, handleDelete, item, button_binding];
    }

    class TableEditPurchase extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { item: 2 });
    	}
    }

    /* src\components\Dropdowns\TableDeletePurchase.svelte generated by Svelte v3.35.0 */

    function create_fragment$5(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.innerHTML = `<i class="fas fa-trash"></i>`;
    			attr(button, "class", "text-blueGray-500 py-1 px-3 rounded-full");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    			/*button_binding*/ ctx[3](button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleDelete*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*button_binding*/ ctx[3](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { item } = $$props;
    	const dispatch = createEventDispatcher();
    	let btnDropdownRef;

    	const handleDelete = () => {
    		// Mostrar el modal de confirmación de SweetAlert2
    		sweetalert2_all.fire({
    			title: "¿Estás seguro?",
    			text: "¡No podrás revertir esto!",
    			icon: "warning",
    			showCancelButton: true,
    			confirmButtonColor: "#d33",
    			cancelButtonColor: "#3085d6",
    			confirmButtonText: "Sí, eliminarlo"
    		}).then(result => {
    			if (result.isConfirmed) {
    				// Enviar la solicitud de eliminación al backend
    				instance$b.delete(`/pedidosDelete/${item.id}`).then(response => {
    					if (response) {
    						sweetalert2_all.fire("¡Eliminado!", "Se eliminó la comprar correctamente", "success");
    						dispatch("customEvent");
    					}
    				}).catch(error => {
    					// Manejar cualquier error que ocurra durante la eliminación
    					console.error("Error al eliminar el Pedido:", error);

    					sweetalert2_all.fire("Error", "Se produjo un error al intentar eliminar el producto.", "error");
    				});
    			}
    		});
    	};

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			btnDropdownRef = $$value;
    			$$invalidate(0, btnDropdownRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(2, item = $$props.item);
    	};

    	return [btnDropdownRef, handleDelete, item, button_binding];
    }

    class TableDeletePurchase extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, { item: 2 });
    	}
    }

    /* src\components\Cards\CardProductList.svelte generated by Svelte v3.35.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[9] = list;
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (83:8) {#each listPurchasedProducts as item}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*item*/ ctx[8].nombreProducto + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*item*/ ctx[8].precioProducto + "";
    	let t2;
    	let t3;
    	let td2;
    	let div;
    	let button0;
    	let t5;
    	let input;
    	let t6;
    	let button1;
    	let t8;
    	let td3;
    	let tableeditpurchase;
    	let t9;
    	let td4;
    	let tabledeletepurchase;
    	let t10;
    	let current;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*item*/ ctx[8]);
    	}

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[5].call(input, /*each_value*/ ctx[9], /*item_index*/ ctx[10]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[6](/*item*/ ctx[8]);
    	}

    	tableeditpurchase = new TableEditPurchase({ props: { item: /*item*/ ctx[8] } });
    	tableeditpurchase.$on("customEvent", /*handleCustomEvent*/ ctx[3]);
    	tabledeletepurchase = new TableDeletePurchase({ props: { item: /*item*/ ctx[8] } });
    	tabledeletepurchase.$on("customEvent", /*handleCustomEvent*/ ctx[3]);

    	return {
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "-";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "+";
    			t8 = space();
    			td3 = element("td");
    			create_component(tableeditpurchase.$$.fragment);
    			t9 = space();
    			td4 = element("td");
    			create_component(tabledeletepurchase.$$.fragment);
    			t10 = space();
    			attr(td0, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td1, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(button0, "class", "bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-l");
    			attr(input, "type", "number");
    			attr(input, "min", "1");
    			attr(input, "class", "w-full border border-gray-300 rounded px-3 py-1 focus:outline-none focus:border-indigo-500 text-xs text-center");
    			attr(button1, "class", "bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-r");
    			attr(div, "class", "flex items-center");
    			attr(td2, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td3, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    			attr(td4, "class", "border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4");
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);
    			append(td1, t2);
    			append(tr, t3);
    			append(tr, td2);
    			append(td2, div);
    			append(div, button0);
    			append(div, t5);
    			append(div, input);
    			set_input_value(input, /*item*/ ctx[8].cantidad);
    			append(div, t6);
    			append(div, button1);
    			append(tr, t8);
    			append(tr, td3);
    			mount_component(tableeditpurchase, td3, null);
    			append(tr, t9);
    			append(tr, td4);
    			mount_component(tabledeletepurchase, td4, null);
    			append(tr, t10);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", click_handler),
    					listen(input, "input", input_input_handler),
    					listen(button1, "click", click_handler_1)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*listPurchasedProducts*/ 1) && t0_value !== (t0_value = /*item*/ ctx[8].nombreProducto + "")) set_data(t0, t0_value);
    			if ((!current || dirty & /*listPurchasedProducts*/ 1) && t2_value !== (t2_value = /*item*/ ctx[8].precioProducto + "")) set_data(t2, t2_value);

    			if (dirty & /*listPurchasedProducts*/ 1 && to_number(input.value) !== /*item*/ ctx[8].cantidad) {
    				set_input_value(input, /*item*/ ctx[8].cantidad);
    			}

    			const tableeditpurchase_changes = {};
    			if (dirty & /*listPurchasedProducts*/ 1) tableeditpurchase_changes.item = /*item*/ ctx[8];
    			tableeditpurchase.$set(tableeditpurchase_changes);
    			const tabledeletepurchase_changes = {};
    			if (dirty & /*listPurchasedProducts*/ 1) tabledeletepurchase_changes.item = /*item*/ ctx[8];
    			tabledeletepurchase.$set(tabledeletepurchase_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tableeditpurchase.$$.fragment, local);
    			transition_in(tabledeletepurchase.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tableeditpurchase.$$.fragment, local);
    			transition_out(tabledeletepurchase.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			destroy_component(tableeditpurchase);
    			destroy_component(tabledeletepurchase);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let div4;
    	let div2;
    	let div1;
    	let div0;
    	let h3;
    	let t0;
    	let t1;
    	let div3;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t2;
    	let t3;
    	let th1;
    	let t4;
    	let t5;
    	let th2;
    	let t6;
    	let t7;
    	let th3;
    	let t8;
    	let t9;
    	let th4;
    	let t10;
    	let t11;
    	let tbody;
    	let current;
    	let each_value = /*listPurchasedProducts*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div4 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t0 = text("Listado de Productos comprados");
    			t1 = space();
    			div3 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			t2 = text("Nombre Producto");
    			t3 = space();
    			th1 = element("th");
    			t4 = text("Producto Precio");
    			t5 = space();
    			th2 = element("th");
    			t6 = text("Cantidad");
    			t7 = space();
    			th3 = element("th");
    			t8 = text("Editar Cantidad");
    			t9 = space();
    			th4 = element("th");
    			t10 = text("Acciones");
    			t11 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(h3, "class", "font-semibold text-lg " + ("text-blueGray-700" ));
    			attr(div0, "class", "relative w-full px-4 max-w-full flex-grow flex-1");
    			attr(div1, "class", "flex flex-wrap items-center");
    			attr(div2, "class", "rounded-t mb-0 px-4 py-3 border-0");

    			attr(th0, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th1, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th2, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th3, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(th4, "class", "px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " + ("bg-blueGray-50 text-blueGray-500 border-blueGray-100"
    			));

    			attr(table, "class", "items-center w-full bg-transparent border-collapse");
    			attr(div3, "class", "block w-full overflow-x-auto");
    			attr(div4, "class", "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded " + ("bg-white" ));
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div2);
    			append(div2, div1);
    			append(div1, div0);
    			append(div0, h3);
    			append(h3, t0);
    			append(div4, t1);
    			append(div4, div3);
    			append(div3, table);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, th0);
    			append(th0, t2);
    			append(tr, t3);
    			append(tr, th1);
    			append(th1, t4);
    			append(tr, t5);
    			append(tr, th2);
    			append(th2, t6);
    			append(tr, t7);
    			append(tr, th3);
    			append(th3, t8);
    			append(tr, t9);
    			append(tr, th4);
    			append(th4, t10);
    			append(table, t11);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*listPurchasedProducts, handleCustomEvent, incrementarCantidad, decrementarCantidad*/ 15) {
    				each_value = /*listPurchasedProducts*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let listPurchasedProducts = [];

    	async function fetchData() {
    		try {
    			const response = await instance$b.get("/pedidos");
    			$$invalidate(0, listPurchasedProducts = response.data);
    			console.log(listPurchasedProducts);
    		} catch(error) {
    			console.error("Error fetching data:", error);
    		}
    	}

    	onMount(fetchData);

    	function incrementarCantidad(item) {
    		const index = listPurchasedProducts.indexOf(item);
    		const updatedItem = { ...item, cantidad: item.cantidad + 1 };

    		$$invalidate(0, listPurchasedProducts = [
    			...listPurchasedProducts.slice(0, index),
    			updatedItem,
    			...listPurchasedProducts.slice(index + 1)
    		]);
    	}

    	function decrementarCantidad(item) {
    		if (item.cantidad > 0) {
    			const index = listPurchasedProducts.indexOf(item);
    			const updatedItem = { ...item, cantidad: item.cantidad - 1 };

    			$$invalidate(0, listPurchasedProducts = [
    				...listPurchasedProducts.slice(0, index),
    				updatedItem,
    				...listPurchasedProducts.slice(index + 1)
    			]);
    		}
    	}

    	const handleCustomEvent = () => {
    		fetchData();
    	};

    	const click_handler = item => decrementarCantidad(item);

    	function input_input_handler(each_value, item_index) {
    		each_value[item_index].cantidad = to_number(this.value);
    		$$invalidate(0, listPurchasedProducts);
    	}

    	const click_handler_1 = item => incrementarCantidad(item);

    	return [
    		listPurchasedProducts,
    		incrementarCantidad,
    		decrementarCantidad,
    		handleCustomEvent,
    		click_handler,
    		input_input_handler,
    		click_handler_1
    	];
    }

    class CardProductList extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* src\views\admin\ListPurchasedProducts.svelte generated by Svelte v3.35.0 */

    function create_fragment$3(ctx) {
    	let div;
    	let cardproductlist;
    	let current;
    	cardproductlist = new CardProductList({});

    	return {
    		c() {
    			div = element("div");
    			create_component(cardproductlist.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(cardproductlist, div, null);
    			current = true;
    		},
    		p: noop$1,
    		i(local) {
    			if (current) return;
    			transition_in(cardproductlist.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardproductlist.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(cardproductlist);
    		}
    	};
    }

    class ListPurchasedProducts extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src\layouts\Admin.svelte generated by Svelte v3.35.0 */

    function create_default_slot$1(ctx) {
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let current;

    	route0 = new Route({
    			props: {
    				path: "Buyproduct",
    				component: Buyproduct
    			}
    		});

    	route1 = new Route({
    			props: {
    				path: "CreateProducts",
    				component: CreateProducts
    			}
    		});

    	route2 = new Route({
    			props: {
    				path: "ListPurchasedProducts",
    				component: ListPurchasedProducts
    			}
    		});

    	return {
    		c() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			current = true;
    		},
    		p: noop$1,
    		i(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(route1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(route2, detaching);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div3;
    	let sidebar;
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let adminnavbar;
    	let t2;
    	let div1;
    	let router;
    	let current;
    	sidebar = new Sidebar({ props: { location: /*location*/ ctx[0] } });
    	adminnavbar = new AdminNavbar({});

    	router = new Router({
    			props: {
    				url: "admin",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div3 = element("div");
    			create_component(sidebar.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t1 = space();
    			create_component(adminnavbar.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			create_component(router.$$.fragment);
    			attr(div0, "class", "relative bg-red-500 md:pt-32 pb-32 pt-12");
    			attr(div1, "class", "px-4 md:px-10 mx-auto w-full -m-24");
    			attr(div2, "class", "relative md:ml-64 bg-blueGray-100");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			mount_component(sidebar, div3, null);
    			append(div3, t0);
    			append(div3, div2);
    			append(div2, div0);
    			append(div2, t1);
    			mount_component(adminnavbar, div2, null);
    			append(div2, t2);
    			append(div2, div1);
    			mount_component(router, div1, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sidebar_changes = {};
    			if (dirty & /*location*/ 1) sidebar_changes.location = /*location*/ ctx[0];
    			sidebar.$set(sidebar_changes);
    			const router_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sidebar.$$.fragment, local);
    			transition_in(adminnavbar.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sidebar.$$.fragment, local);
    			transition_out(adminnavbar.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			destroy_component(sidebar);
    			destroy_component(adminnavbar);
    			destroy_component(router);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { location } = $$props;

    	$$self.$$set = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    	};

    	return [location];
    }

    class Admin extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { location: 0 });
    	}
    }

    /* src\App.svelte generated by Svelte v3.35.0 */

    function create_fragment$1(ctx) {
    	let div11;
    	let main;
    	let section;
    	let div0;
    	let t0;
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let div2;
    	let t3;
    	let div6;
    	let form;
    	let div3;
    	let t6;
    	let div4;
    	let t9;
    	let div5;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div11 = element("div");
    			main = element("main");
    			section = element("section");
    			div0 = element("div");
    			t0 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div2 = element("div");

    			div2.innerHTML = `<div class="text-center mb-3"><h6 class="text-blueGray-500 text-sm font-bold">Inicia sesión</h6></div> 
                  <hr class="mt-6 border-b-1 border-blueGray-300"/>`;

    			t3 = space();
    			div6 = element("div");
    			form = element("form");
    			div3 = element("div");

    			div3.innerHTML = `<label class="block uppercase text-blueGray-600 text-xs font-bold mb-2" for="grid-user">Usuario</label> 
                      <input id="grid-user" type="text" class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150" placeholder="Usuario"/>`;

    			t6 = space();
    			div4 = element("div");

    			div4.innerHTML = `<label class="block uppercase text-blueGray-600 text-xs font-bold mb-2" for="grid-password">Contraseña</label> 
                      <input id="grid-password" type="password" class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150" placeholder="Password"/>`;

    			t9 = space();
    			div5 = element("div");
    			button = element("button");
    			button.textContent = "Iniciar sesión";
    			attr(div0, "class", "absolute top-0 w-full h-full bg-blueGray-800 bg-no-repeat bg-full");
    			set_style(div0, "background-image", "url(" + registerBg2 + ")");
    			attr(div2, "class", "rounded-t mb-0 px-6 py-6");
    			attr(div3, "class", "relative w-full mb-3");
    			attr(div4, "class", "relative w-full mb-3");
    			attr(button, "class", "bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150");
    			attr(button, "type", "button");
    			attr(div5, "class", "text-center mt-6");
    			attr(div6, "class", "flex-auto px-4 lg:px-10 py-10 pt-0");
    			attr(div7, "class", "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0");
    			attr(div8, "class", "w-full lg:w-4/12 px-4");
    			attr(div9, "class", "flex content-center items-center justify-center h-full");
    			attr(div10, "class", "container mx-auto px-4 h-full");
    			attr(section, "class", "relative w-full h-full py-40 min-h-screen");
    		},
    		m(target, anchor) {
    			insert(target, div11, anchor);
    			append(div11, main);
    			append(main, section);
    			append(section, div0);
    			append(section, t0);
    			append(section, div10);
    			append(div10, div9);
    			append(div9, div8);
    			append(div8, div7);
    			append(div7, div2);
    			append(div7, t3);
    			append(div7, div6);
    			append(div6, form);
    			append(form, div3);
    			append(form, t6);
    			append(form, div4);
    			append(form, t9);
    			append(form, div5);
    			append(div5, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*iniciarSesion*/ ctx[0]);
    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div11);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const registerBg2 = "../assets/img/register_bg_2.png";

    function instance$1($$self) {
    	let username = "";
    	let password = "";

    	async function iniciarSesion() {
    		username = document.getElementById("grid-user").value;
    		password = document.getElementById("grid-password").value;

    		try {
    			const response = await axios.post("http://localhost:3000/login", { username, password });

    			if (response.data.token) {
    				localStorage.setItem("token", response.data.token);
    				navigate("/admin/CreateProducts");

    				sweetalert2_all.fire({
    					icon: "success",
    					text: "Inició la sección correctamente."
    				});
    			}
    		} catch(error) {
    			sweetalert2_all.fire({
    				icon: "error",
    				text: "Credenciales inválidas."
    			});

    			throw new Error("Credenciales inválidas");
    		}
    	} //navigate("/admin/CreateProducts");

    	return [iniciarSesion];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src\Index.svelte generated by Svelte v3.35.0 */

    function create_default_slot(ctx) {
    	let route0;
    	let t;
    	let route1;
    	let current;

    	route0 = new Route({
    			props: { path: "admin/*admin", component: Admin }
    		});

    	route1 = new Route({ props: { path: "/", component: App } });

    	return {
    		c() {
    			create_component(route0.$$.fragment);
    			t = space();
    			create_component(route1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(route1, target, anchor);
    			current = true;
    		},
    		p: noop$1,
    		i(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach(t);
    			destroy_component(route1, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(router.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(router, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { url = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	return [url];
    }

    class Index extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { url: 0 });
    	}
    }

    const app = new Index({
      target: document.getElementById("app"),
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
