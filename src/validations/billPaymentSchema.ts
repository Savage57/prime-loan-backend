import Joi from "joi";

/**
 * -----------------------------
 * BILL PAYMENT VALIDATION
 * - Generic `billPaymentSchema` matches BillPaymentService.initiateBillPayment
 * - extras enforced conditionally based on serviceType
 * -----------------------------
 */
export const billPaymentSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    "number.base": "amount must be a number",
    "number.positive": "amount must be greater than 0",
  }),
  serviceType: Joi.string()
    .valid("airtime", "data", "tv", "power", "betting", "internet", "waec", "jamb")
    .required(),
  serviceId: Joi.string().allow("", null), // provider/service-specific id; may be required depending on serviceType (enforced in extras switch)
  customerReference: Joi.string().required().messages({
    "string.empty": "customerReference (target account/phone/meter) is required",
  }),
  extras: Joi.alternatives().conditional(Joi.ref("serviceType"), {
    switch: [
      {
        is: "airtime",
        then: Joi.object({
          mobileNetwork: Joi.string().required(),
          bonusType: Joi.string().optional(),
        }).required(),
      },
      {
        is: "data",
        then: Joi.object({
          mobileNetwork: Joi.string().required(),
        }).required(),
      },
      {
        is: "tv",
        then: Joi.object({
          pkg: Joi.string().required(),
        }).required(),
      },
      {
        is: "power",
        then: Joi.object({
          meterType: Joi.string().valid("01", "02").required(), // 01 = prepaid, 02 = postpaid
        }).required(),
      },
      {
        is: "internet",
        then: Joi.object({
          internetNetwork: Joi.string().valid("smile-direct", "spectranet").required(),
        }).required(),
      },
      {
        is: "betting",
        then: Joi.object().optional(),
      },
      {
        is: "waec",
        then: Joi.object().optional(),
      },
      {
        is: "jamb",
        then: Joi.object().optional(),
      },
    ],
    otherwise: Joi.forbidden().messages({
      "any.unknown": "Unsupported serviceType",
    }),
  }),
  idempotencyKey: Joi.string().optional(),
});

/**
 * Per-endpoint verification schemas (used by verify endpoints)
 */
export const tvVerifySchema = Joi.object({
  cableTV: Joi.string().required(),
  smartCardNo: Joi.string().required(),
});

export const powerVerifySchema = Joi.object({
  electricCompany: Joi.string().required(),
  meterNo: Joi.string().required(),
});

export const bettingVerifySchema = Joi.object({
  bettingCompany: Joi.string().required(),
  customerId: Joi.string().required(),
});

export const smileVerifySchema = Joi.object({
  mobileNumber: Joi.string().required(),
});

export const jambVerifySchema = Joi.object({
  examType: Joi.string().required(),
  profileId: Joi.string().required(),
});