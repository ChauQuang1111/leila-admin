import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Product from "@/lib/models/Product";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { cartItems, customer } = await req.json();

    if (!cartItems || !customer) {
      return new NextResponse("Not enough data to checkout", { status: 400 });
    }

    let product;
    //check quantity
    let cartItem;
    for (let i = 0; i < cartItems.length; i++) {
      cartItem = cartItems[i];

      //console.log("cartItem: " + cartItem.item._id);
      product = await Product.findById(cartItem.item._id);
      //console.log("Product: " + product);
      if (!product) {
        console.log("Product " + cartItem.item._id + ", " + cartItem.item.title + " is not found.");
        return new NextResponse("Product " + cartItem.item.title + " is not found.", { status: 400 });
      }
      if (cartItem.quantity > product.quantity) {
        console.log("cartItem's quantity " + cartItem.quantity + " is greater than product's quantity " + product.quantity);
        return new NextResponse(JSON.stringify({ message: "cartItem's quantity " + cartItem.quantity + " is greater than product's quantity " + product.quantity }), { status: 400 });
      }
      product.quantity -= cartItem.quantity;
      // Update product
      const updatedProduct = await Product.findByIdAndUpdate(product._id, { quantity: product.quantity }, { new: true });
      console.log("Update: " + updatedProduct);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      shipping_options: [
        { shipping_rate: "shr_1PKuOL029E03QqRTjCqL6BAu" },
        { shipping_rate: "shr_1PKuLr029E03QqRTToDWT5Xg" },
      ],
      line_items: cartItems.map((cartItem: any) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: cartItem.item.title,
            metadata: {
              productId: cartItem.item._id,
              ...(cartItem.size && { size: cartItem.size }),
              ...(cartItem.color && { color: cartItem.color }),
            },
          },
          unit_amount: cartItem.item.price * 100,
        },
        quantity: cartItem.quantity,
      })),
      client_reference_id: customer.clerkId,
      success_url: `${process.env.ECOMMERCE_STORE_URL}/payment_success`,
      cancel_url: `${process.env.ECOMMERCE_STORE_URL}/cart`,
    });

    return NextResponse.json(session, { headers: corsHeaders });
  } catch (err) {
    console.log("[checkout_POST]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
