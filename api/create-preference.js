export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      checkoutId,
      licenseKey,
      product,
      package: selectedPackage,
      finalPrice,
      email,
      buyerName,
      organization,
    } = req.body;

    if (!checkoutId || !licenseKey || !product || !finalPrice || !email) {
      return res.status(400).json({
        error: "Missing required checkout data",
      });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        error: "MP_ACCESS_TOKEN is not configured",
      });
    }

    const USD_TO_ARS_RATE = Number(process.env.USD_TO_ARS_RATE || 1200);

const priceUsd = Number(finalPrice);
const priceArs = Math.round(priceUsd * USD_TO_ARS_RATE);

    const preferencePayload = {
      items: [
        {
          title: `Hwarang Scoring Universe - ${product.toUpperCase()} ${selectedPackage} - USD ${priceUsd}`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: priceArs,
        },
      ],

      payer: {
        name: buyerName,
        email,
      },

      external_reference: checkoutId,

      metadata: {
        checkoutId,
        licenseKey,
        product,
        selectedPackage,
        organization,
        priceUsd,
priceArs,
usdToArsRate: USD_TO_ARS_RATE,
      },

      back_urls: {
        success: "https://www.hwarangscoring.org/payment/success",
        failure: "https://www.hwarangscoring.org/payment/failure",
        pending: "https://www.hwarangscoring.org/payment/pending",
      },

      auto_return: "approved",
    };

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferencePayload),
      }
    );

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(500).json({
        error: "Mercado Pago preference creation failed",
        detail: data,
      });
    }

    return res.status(200).json({
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error creating Mercado Pago preference",
      detail: error.message,
    });
  }
}