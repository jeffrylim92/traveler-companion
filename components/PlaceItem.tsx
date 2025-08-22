import React from "react";
import { View, Text, Image } from "react-native";
import { getPhotoUrl } from "../api/googlePlaces";

type PlaceProps = {
  name: string;
  rating?: number;
  address?: string;
  photoRef?: string;
};

export default function PlaceItem({ name, rating, address, photoRef }: PlaceProps) {
  return (
    <View style={{ margin: 10, padding: 10, borderWidth: 1, borderRadius: 10 }}>
      {photoRef && (
        <Image
          source={{ uri: getPhotoUrl(photoRef, "Xij4rSQMVuFGwYbKGT4AVRv26VaEis") }}
          style={{ width: "100%", height: 150, borderRadius: 8 }}
        />
      )}
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>{name}</Text>
      {rating && <Text>⭐ {rating}</Text>}
      {address && <Text>{address}</Text>}
    </View>
  );
}
