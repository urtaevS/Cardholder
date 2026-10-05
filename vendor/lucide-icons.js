/*!
 * Локальный набор иконок Lucide — MIT License, https://lucide.dev
 * Copyright (c) lucide contributors
 *
 * Сгенерировано из lucide@0.469.0 (dist/umd) автоматически.
 * Вручную не редактировать — при добавлении новой иконки в index.html
 * нужно будет перегенерировать этот файл.
 *
 * Зачем локально, а не через CDN:
 *  - unpkg.com блокируется у ряда провайдеров и намертво виснет;
 *  - jsdelivr — внешняя зависимость, приложение не работает офлайн;
 *  - полный lucide.min.js весит ~350 КБ, здесь только нужные иконки.
 *
 * API совместим с lucide: window.lucide.createIcons() и
 * window.lucide.createIcons({ root: элемент }).
 */
(function (global) {
  'use strict';

  // Данные иконок в формате lucide: [тег, атрибуты, [[дочерний тег, атрибуты], ...]]
  var ICONS = {
    "chevron-left": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "m15 18-6-6 6-6"
          }
        ]
      ]
    ],
    "chevron-down": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "m6 9 6 6 6-6"
          }
        ]
      ]
    ],
    "clipboard": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "rect",
          {
            "width": "8",
            "height": "4",
            "x": "8",
            "y": "2",
            "rx": "1",
            "ry": "1"
          }
        ],
        [
          "path",
          {
            "d": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
          }
        ]
      ]
    ],
    "cloud": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
          }
        ]
      ]
    ],
    "cloud-download": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M12 13v8l-4-4"
          }
        ],
        [
          "path",
          {
            "d": "m12 21 4-4"
          }
        ],
        [
          "path",
          {
            "d": "M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"
          }
        ]
      ]
    ],
    "cloud-upload": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M12 13v8"
          }
        ],
        [
          "path",
          {
            "d": "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
          }
        ],
        [
          "path",
          {
            "d": "m8 17 4-4 4 4"
          }
        ]
      ]
    ],
    "credit-card": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "rect",
          {
            "width": "20",
            "height": "14",
            "x": "2",
            "y": "5",
            "rx": "2"
          }
        ],
        [
          "line",
          {
            "x1": "2",
            "x2": "22",
            "y1": "10",
            "y2": "10"
          }
        ]
      ]
    ],
    "download": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
          }
        ],
        [
          "polyline",
          {
            "points": "7 10 12 15 17 10"
          }
        ],
        [
          "line",
          {
            "x1": "12",
            "x2": "12",
            "y1": "15",
            "y2": "3"
          }
        ]
      ]
    ],
    "edit-3": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M12 20h9"
          }
        ],
        [
          "path",
          {
            "d": "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"
          }
        ]
      ]
    ],
    "file-text": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
          }
        ],
        [
          "path",
          {
            "d": "M14 2v4a2 2 0 0 0 2 2h4"
          }
        ],
        [
          "path",
          {
            "d": "M10 9H8"
          }
        ],
        [
          "path",
          {
            "d": "M16 13H8"
          }
        ],
        [
          "path",
          {
            "d": "M16 17H8"
          }
        ]
      ]
    ],
    "help-circle": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "circle",
          {
            "cx": "12",
            "cy": "12",
            "r": "10"
          }
        ],
        [
          "path",
          {
            "d": "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
          }
        ],
        [
          "path",
          {
            "d": "M12 17h.01"
          }
        ]
      ]
    ],
    "image": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "rect",
          {
            "width": "18",
            "height": "18",
            "x": "3",
            "y": "3",
            "rx": "2",
            "ry": "2"
          }
        ],
        [
          "circle",
          {
            "cx": "9",
            "cy": "9",
            "r": "2"
          }
        ],
        [
          "path",
          {
            "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
          }
        ]
      ]
    ],
    "plus-circle": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "circle",
          {
            "cx": "12",
            "cy": "12",
            "r": "10"
          }
        ],
        [
          "path",
          {
            "d": "M8 12h8"
          }
        ],
        [
          "path",
          {
            "d": "M12 8v8"
          }
        ]
      ]
    ],
    "scan-line": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M3 7V5a2 2 0 0 1 2-2h2"
          }
        ],
        [
          "path",
          {
            "d": "M17 3h2a2 2 0 0 1 2 2v2"
          }
        ],
        [
          "path",
          {
            "d": "M21 17v2a2 2 0 0 1-2 2h-2"
          }
        ],
        [
          "path",
          {
            "d": "M7 21H5a2 2 0 0 1-2-2v-2"
          }
        ],
        [
          "path",
          {
            "d": "M7 12h10"
          }
        ]
      ]
    ],
    "upload": [
      "svg",
      {
        "xmlns": "http://www.w3.org/2000/svg",
        "width": 24,
        "height": 24,
        "viewBox": "0 0 24 24",
        "fill": "none",
        "stroke": "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      [
        [
          "path",
          {
            "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
          }
        ],
        [
          "polyline",
          {
            "points": "17 8 12 3 7 8"
          }
        ],
        [
          "line",
          {
            "x1": "12",
            "x2": "12",
            "y1": "3",
            "y2": "15"
          }
        ]
      ]
    ]
  };

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function appendAttrs(el, attrs) {
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, String(attrs[key]));
    });
  }

  function buildSvg(name, def) {
    var svg = document.createElementNS(SVG_NS, def[0]);
    appendAttrs(svg, def[1]);

    (def[2] || []).forEach(function (child) {
      var childEl = document.createElementNS(SVG_NS, child[0]);
      appendAttrs(childEl, child[1]);
      svg.appendChild(childEl);
    });

    // Порядок и набор атрибутов совпадают с оригинальным lucide,
    // чтобы работали существующие правила в styles.css (.icon-btn svg и т.п.)
    svg.setAttribute('data-lucide', name);
    svg.setAttribute('class', 'lucide lucide-' + name);

    return svg;
  }

  /**
   * Заменяет все элементы с data-lucide на соответствующие <svg>.
   * Уже отрендеренные <svg class="lucide"> тоже перерисовываются — это нужно
   * app.js для смены иконки шеврона при раскрытии панели действий.
   *
   * @param {{root?: Element}} [options]
   */
  function createIcons(options) {
    var opts = options || {};
    var root = opts.root || document;

    Array.prototype.forEach.call(root.querySelectorAll('[data-lucide]'), function (el) {
      var name = el.getAttribute('data-lucide');
      if (!name) return;

      var def = ICONS[name];
      if (!def) {
        console.warn('[lucide-icons] Иконка "' + name + '" отсутствует в локальном наборе');
        return;
      }

      if (el.parentNode) {
        el.parentNode.replaceChild(buildSvg(name, def), el);
      }
    });
  }

  global.lucide = { createIcons: createIcons, icons: ICONS };
})(window);
