// src/constants/index.ts
var DIRECTIVE_VALUES = {
  temp: "s-temp",
  cast: "s-cast",
  crate: "s-crate",
  delete: "s-delete",
  index: "s-index",
  sequence: "s-sequence",
  slot: "s-slot"
};

// src/errors/index.ts
var StamperError = class extends Error {
  static {
    this.prototype.name = "StamperError";
  }
  constructor(message) {
    const stackLine = (new Error().stack?.split("\n")[2] || "").trim();
    super(`StamperError:
${message}

${stackLine}`);
  }
};

// src/Stamper.ts
var Stamper = class {
  stamperArea;
  tempEl;
  castEl;
  crateEl;
  currentIndex;
  callback;
  /**
   * Stamperのインスタンスを作成します。
   * @param {Object} params - コンストラクタのパラメータ。
   * @param {HTMLElement} params.stamperArea - 使用するスタンパーエリア。
   */
  constructor({ stamperArea }) {
    this.stamperArea = stamperArea;
    this.currentIndex = 0;
    this.tempEl = null;
    this.castEl = null;
    this.crateEl = null;
    this.callback = () => {
    };
  }
  /**
   * エラーを処理し、コンソールにログを出力します。
   * @private
   * @param {unknown} error - 処理するエラー。
   */
  handleError(error) {
    if (error instanceof StamperError) {
      console.warn(error.message);
    } else {
      console.error(error);
    }
  }
  /**
   * 指定されたディレクティブと識別子に基づいて要素をクエリします。
   * @private
   * @param {string} directive - ディレクティブ。
   * @param {string | null} identifier - 識別子。
   * @returns {HTMLElement | null} クエリされた要素。
   */
  queryElement(directive, identifier) {
    if (!identifier) throw new StamperError("Missing identifier.");
    const element = this.stamperArea.querySelector(
      `[${directive}="${identifier}"]`
    );
    if (!element) throw new StamperError(`Missing element. [${directive}]`);
    return element;
  }
  /**
   * キャスト要素にクリックイベントを設定します。
   * @private
   * @throws {StamperError} キャスト要素が見つからない場合。
   */
  setupClickEvent() {
    if (!this.tempEl || !this.castEl || !this.crateEl) {
      throw new StamperError(
        `Missing elements. [${DIRECTIVE_VALUES.temp}|${DIRECTIVE_VALUES.cast}|${DIRECTIVE_VALUES.crate}]`
      );
    }
    this.castEl.addEventListener("click", (event) => {
      try {
        const fragment = this.createFragment();
        this.addIndex(fragment);
        const children = Array.from(fragment.children);
        if (!this.crateEl)
          throw new StamperError(
            `Missing elements. [${DIRECTIVE_VALUES.crate}]`
          );
        this.crateEl.appendChild(fragment);
        if (this.callback) {
          this.callback(children);
        }
        this.setupDeleteEvent(children);
        this.currentIndex++;
      } catch (error) {
        this.handleError(error);
      }
    });
  }
  /**
   * 削除イベントを設定します。
   * @private
   * @param {HTMLElement[]} children - 子要素の配列。
   */
  setupDeleteEvent(children) {
    const deleteEl = children.reduce((prev, curr) => {
      if (curr.hasAttribute(DIRECTIVE_VALUES.delete)) {
        prev.push(curr);
      } else {
        const delEl = curr.querySelector(
          `[${DIRECTIVE_VALUES.delete}]`
        );
        if (delEl) prev.push(delEl);
      }
      return prev;
    }, [])[0];
    if (deleteEl && children.length > 0) {
      deleteEl.addEventListener("click", (event) => {
        if (!(event.currentTarget instanceof HTMLButtonElement))
          throw new StamperError("Invalid element.");
        const ariaLabel = event.currentTarget.getAttribute("aria-label") || "Delete element";
        if (window.confirm(`\u4EE5\u4E0B\u306E\u51E6\u7406\u3092\u5B9F\u884C\u3057\u307E\u3059
- ${ariaLabel}`)) {
          children.forEach((child) => {
            child.remove();
          });
        }
      });
    }
  }
  /**
   * フラグメントにインデックスを追加します。
   * @private
   * @param {DocumentFragment} fragment - インデックスを追加するフラグメント。
   */
  addIndex(fragment) {
    const indexEls = fragment.querySelectorAll(
      `[${DIRECTIVE_VALUES.index}]`
    );
    indexEls.forEach((indexEl) => {
      const targetAttrKeys = indexEl.getAttribute(
        `${DIRECTIVE_VALUES.index}`
      );
      if (targetAttrKeys) {
        const targetAttrKeysArray = targetAttrKeys.split(",");
        targetAttrKeysArray.forEach((targetAttrKey) => {
          const targetAttrValue = indexEl.getAttribute(targetAttrKey)?.replace(/{{index}}/gi, this.currentIndex.toString()).replace(
            /{{index\+\+}}/gi,
            (this.currentIndex + 1).toString()
          );
          if (targetAttrValue) {
            indexEl.setAttribute(targetAttrKey, targetAttrValue);
          }
        });
      }
    });
  }
  /**
   * テンプレートの内容からドキュメントフラグメントを作成します。
   * @private
   * @returns {DocumentFragment} 作成されたドキュメントフラグメント。
   */
  createFragment() {
    const fragment = this.tempEl.content.cloneNode(
      true
    );
    this.addSequenceToFragment(fragment);
    return fragment;
  }
  /**
   * フラグメントにシーケンスを追加します。
   * @private
   * @param {DocumentFragment} fragment - シーケンスを追加するフラグメント。
   */
  addSequenceToFragment(fragment) {
    const sequenceEls = fragment.querySelectorAll(
      `[${DIRECTIVE_VALUES.sequence}]`
    );
    sequenceEls.forEach((sequenceEl) => {
      sequenceEl.textContent = this.generateSequence(
        sequenceEl
      );
    });
  }
  /**
   * ゼロパディングされたインデックス文字列を生成します。
   * @private
   * @param {HTMLElement} target - パディング番号を取得するターゲット要素。
   * @returns {string} 生成されたインデックス文字列。
   * @throws {StamperError} s-sequence属性が見つからない場合。
   */
  generateSequence(target) {
    const paddingNum = target.getAttribute(`${DIRECTIVE_VALUES.sequence}`);
    if (!paddingNum)
      throw new StamperError(
        `Missing attribute: ${DIRECTIVE_VALUES.sequence}.`
      );
    const digit = (paddingNum.match(/0/g) || []).length;
    const indexString = (this.currentIndex + 1).toString();
    return this.zeroPad(indexString, digit);
  }
  /**
   * 数字文字列をゼロパディングします。
   * @private
   * @param {string} numString - パディングする数字文字列。
   * @param {number} length - パディングする長さ。
   * @returns {string} パディングされた数字文字列。
   */
  zeroPad(numString, length) {
    return numString.padStart(length, "0");
  }
  /**
   * 提供されたデータでフラグメントのスロットを埋めます。
   * @private
   * @param {DocumentFragment} fragment - スロットを埋めるフラグメント。
   * @param {Object} data - スロットを埋めるためのデータ。
   */
  populateSlots(fragment, data) {
    Object.keys(data).forEach((key) => {
      const slot = fragment.querySelector(
        `[${DIRECTIVE_VALUES.slot}=${key}]`
      );
      if (slot) slot.textContent = data[key];
    });
  }
  /**
   * テンプレートとキャスト要素が存在することを確認します。
   * @private
   * @throws {StamperError} テンプレートまたはキャスト要素が見つからない場合。
   */
  validateTemplateAndCast() {
    if (!this.tempEl) throw new StamperError("Template element not found.");
    if (!this.castEl) throw new StamperError("Cast element not found.");
  }
  /**
   * クリックイベントを設定してStamperを初期化します。
   * @throws {StamperError} キャスト要素が見つからない場合。
   */
  init() {
    try {
      const identifier = this.stamperArea.getAttribute("stamper");
      const tempEl = this.queryElement(DIRECTIVE_VALUES.temp, identifier);
      if (tempEl instanceof HTMLTemplateElement) {
        this.tempEl = tempEl;
      } else {
        throw new StamperError(
          `${DIRECTIVE_VALUES.temp} is invalid element.`
        );
      }
      this.castEl = this.queryElement(DIRECTIVE_VALUES.cast, identifier);
      this.crateEl = this.queryElement(
        DIRECTIVE_VALUES.crate,
        identifier
      );
      this.setupClickEvent();
    } catch (error) {
      this.handleError(error);
    }
  }
  /**
   * コールバックを設定します。
   * @param {Function} callback - コールバック関数。
   */
  addCallback(callback) {
    this.callback = callback;
  }
  /**
   * 提供されたデータでスロットを埋めてアイテムを追加します。
   * @param {Object} data - スロットを埋めるためのデータ。
   * @throws {StamperError} テンプレートまたはキャスト要素が見つからない場合。
   */
  addItemWithSlot(data) {
    try {
      this.validateTemplateAndCast();
      const fragment = this.createFragment();
      this.populateSlots(fragment, data);
      this.castEl.before(fragment);
    } catch (error) {
      this.handleError(error);
    }
  }
};
export {
  Stamper
};