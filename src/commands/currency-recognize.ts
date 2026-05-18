import type { AppSession } from "@mentra/sdk";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { getSettings } from "../services/settings-store";
import type { CurrencyBill } from "../types";
import { AbstractCommandHandler } from "./base-command";

function unitAr(currency: string): string {
  return currency === "SAR" ? "ريال" : currency === "USD" ? "دولار" : currency;
}

function unitEn(currency: string): string {
  return currency === "SAR" ? "Saudi Riyal" : currency === "USD" ? "dollar" : currency;
}

function describeBillAr(b: CurrencyBill, currency: string): string {
  const u = unitAr(currency);
  if (b.count === 1) return `ورقة ${b.denomination} ${u}`;
  if (b.count === 2) return `ورقتين ${b.denomination} ${u}`;
  return `${b.count} ورقات من فئة ${b.denomination} ${u}`;
}

function describeBillEn(b: CurrencyBill, currency: string): string {
  const u = unitEn(currency);
  const noun = b.count === 1 ? "bill" : "bills";
  return `${b.count} ${b.denomination} ${u} ${noun}`;
}

function joinEn(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/**
 * Currency Recognition command.
 * Captures a photo, counts every visible bill grouped by denomination,
 * and speaks a summary including counts and total.
 */
export class CurrencyRecognizeCommand extends AbstractCommandHandler {
  constructor() {
    super("CurrencyRecognize");
  }

  protected async process(
    session: AppSession,
    photo: string,
    _params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const result = await this.ai.recognizeCurrency(photo);
    this.logger.info(`${result.bills.length} denomination(s), total ${result.total} ${result.currency}`);

    if (result.bills.length === 0) {
      await speakBilingual(session, messages.noMoney, sessionId);
      return;
    }

    if (result.currency === "UNKNOWN") {
      await speakBilingual(session, messages.unknownCurrency, sessionId);
      return;
    }

    const language = getSettings().language;
    const text = language === "ar"
      ? this.composeAr(result.bills, result.total, result.currency, result.otherCurrencies)
      : this.composeEn(result.bills, result.total, result.currency, result.otherCurrencies);

    await speak(session, text, sessionId);
  }

  private composeAr(
    bills: CurrencyBill[],
    total: number,
    currency: string,
    otherCurrencies: Array<{ currency: string; bills: CurrencyBill[]; total: number }> | undefined,
  ): string {
    const u = unitAr(currency);
    // Single-bill happy path — preserve the original phrasing
    if (bills.length === 1 && bills[0].count === 1) {
      let text = `هذي ورقة ${bills[0].denomination} ${u}`;
      if (otherCurrencies?.length) {
        text += `. ${this.otherCurrenciesTailAr(otherCurrencies)}`;
      }
      return text;
    }

    const parts = bills.map(b => describeBillAr(b, currency)).join(" و ");
    let text = `معك ${parts}، المجموع ${total} ${u}`;
    if (otherCurrencies?.length) {
      text += `. ${this.otherCurrenciesTailAr(otherCurrencies)}`;
    }
    return text;
  }

  private composeEn(
    bills: CurrencyBill[],
    total: number,
    currency: string,
    otherCurrencies: Array<{ currency: string; bills: CurrencyBill[]; total: number }> | undefined,
  ): string {
    const u = unitEn(currency);
    if (bills.length === 1 && bills[0].count === 1) {
      let text = `This is a ${bills[0].denomination} ${u} bill`;
      if (otherCurrencies?.length) {
        text += `. ${this.otherCurrenciesTailEn(otherCurrencies)}`;
      }
      return text;
    }

    const parts = bills.map(b => describeBillEn(b, currency));
    let text = `You have ${joinEn(parts)}, total ${total} ${u}`;
    if (otherCurrencies?.length) {
      text += `. ${this.otherCurrenciesTailEn(otherCurrencies)}`;
    }
    return text;
  }

  private otherCurrenciesTailAr(
    others: Array<{ currency: string; bills: CurrencyBill[]; total: number }>,
  ): string {
    const phrases = others.map(o => o.bills.map(b => describeBillAr(b, o.currency)).join(" و "));
    return `وأيضًا ${phrases.join(". ")}`;
  }

  private otherCurrenciesTailEn(
    others: Array<{ currency: string; bills: CurrencyBill[]; total: number }>,
  ): string {
    const phrases = others.map(o => joinEn(o.bills.map(b => describeBillEn(b, o.currency))));
    return `Also ${phrases.join(". ")}`;
  }
}
